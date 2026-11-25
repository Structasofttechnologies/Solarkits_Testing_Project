const express = require('express');
const router = express.Router();
const check_auth = require('../middlewares/check.auth');
const warehouses = require('../controller/warehouse.handler');
const supplier = require('../controller/supplier.handler');
const catalog = require('../controller/catalog.handler');
const orders = require('../controller/orders.handler');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer storage for supplier invoice PDFs
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../../public/uploads/supplier_invoices');
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + "_" + Math.round(Math.random() * 1e9);
        cb(null, `invoice_${unique}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB max
});

// Placeholder for supplier profile/management routes
router.get('/profile', (req, res) => res.json({ message: 'Supplier profile' }));
router.patch('/profile', check_auth, supplier.update_profile);

// Warehouse routes
router.get('/warehouses/check-coverage', check_auth, warehouses.check_coverage);
router.post('/warehouses',               check_auth, warehouses.create_warehouse);
router.get('/warehouses',                check_auth, warehouses.get_warehouses);
router.patch('/warehouses/:id',          check_auth, warehouses.update_warehouse);

// State Request, GST & Office routes
router.post('/state-requests',             check_auth, supplier.create_state_request);
router.get('/state-requests',              check_auth, supplier.get_state_requests);
router.post('/add-gst',                    check_auth, supplier.add_gst);
router.patch('/office-locations/:officeId', check_auth, supplier.update_office_location);

// Catalog, supply setup & pricing routes
router.get('/catalog/templates',                   check_auth, catalog.listTemplates);
router.get('/catalog/brands',                      check_auth, catalog.listBrandsForTemplates);
router.get('/warehouses/:warehouseId/supply-config', check_auth, catalog.getSupplyConfig);
router.post('/warehouses/:warehouseId/supply-config', check_auth, catalog.updateSupplyConfig);
router.get('/warehouses/:warehouseId/skus',          check_auth, catalog.listWarehouseSkus);
router.post('/warehouses/:warehouseId/prices',         check_auth, catalog.updateWarehousePrices);

// Purchase Orders (POs)
router.get('/orders', check_auth, orders.get_supplier_orders);
router.post('/orders/:id/accept-invoice', check_auth, upload.single('invoice_pdf'), orders.accept_and_invoice);

module.exports = router;

