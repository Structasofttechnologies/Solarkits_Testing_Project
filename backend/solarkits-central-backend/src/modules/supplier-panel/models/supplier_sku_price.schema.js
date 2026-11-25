const mongoose = require('mongoose');
const { supplier_db } = require('../config/databases');

const supplierSkuPriceSchema = new mongoose.Schema({
    supplier_id: { type: mongoose.Schema.Types.ObjectId, ref: 'suppliers', required: true },
    warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'supplier_warehouses', required: true },
    sku_id: { type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_skus', required: true },
    price: { type: Number, required: true, default: 0 },
    price_per_watt: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true }
}, {
    collection: 'supplier_sku_prices',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

supplierSkuPriceSchema.index({ warehouse_id: 1, sku_id: 1 }, { unique: true });

module.exports = supplier_db.model('supplier_sku_prices', supplierSkuPriceSchema);
