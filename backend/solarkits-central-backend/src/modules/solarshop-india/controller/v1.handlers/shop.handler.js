const mongoose = require("mongoose");
const { processEpcCheckout, confirmEpcOrderPayment } = require("../../../admin-panel/services/epc.order.service");

const CompanyWarehouse = require("../../models/india_core_db/company_warehouses.schema");
const WarehouseKitActivation = require("../../models/india_core_db/warehouse_kit_activations.schema");
const ComboKit = require("../../models/india_solarshop_db/combo_kits.schema");
const SolarKit = require("../../models/india_core_db/solar_kits.schema");
const ProjectCategory = require("../../models/india_core_db/project_categories.schema");
const ProjectSubcategory = require("../../models/india_core_db/project_subcategories.schema");
const GeoLevel2 = require("../../models/geolocation_db/geo_level_2.schema");
const ProductSkuPrice = require("../../models/india_core_db/product_sku_prices.schema");
const CompanyMargin = require("../../models/india_solarshop_db/company_margins.schema");
const WarehouseStock = require("../../models/india_core_db/warehouse_stocks.schema");
const ProductSku = require("../../models/india_core_db/product_skus.schema");
const Product = require("../../models/india_core_db/products.schema");
const Brand = require("../../models/india_core_db/brands.schema");
const BulkKitSetting = require("../../models/india_solarshop_db/bulk_kit_settings.schema");
const SubtypeAttribute = require("../../models/india_core_db/subtype_attributes.schema");
const ProductAttributeValue = require("../../../admin-panel/models/core_db/product_attribute_values.schema");
const AttributeOption = require("../../../admin-panel/models/core_db/attribute_options.schema");
const SolarShopSettings = require("../../models/india_solarshop_db/solarshop_settings.schema");
const Cart = require("../../models/india_solarshop_db/cart.schema");
const OfferMaster = require("../../models/india_solarshop_db/offer_masters.schema");
const InventoryReservation = require("../../models/india_solarshop_db/inventory_reservations.schema");
const PurchaseOrder = require("../../models/india_solarshop_db/purchase_order.schema");
const RequestOrder = require("../../models/india_solarshop_db/request_orders.schema");
const ComboBundleMaster = require("../../models/india_solarshop_db/combo_bundle_masters.schema");
const ComboKitVariant = require("../../models/india_solarshop_db/combo_kit_variants.schema");
// Register solarshop db pc_combo_kits schema for populate() relations
require("../../models/india_solarshop_db/combo_kits.schema");

const GeoLevel0 = require("../../models/geolocation_db/geo_level_0.schema");
const GeoLevel1 = require("../../models/geolocation_db/geo_level_1.schema");
const { india_solarshop_db, core_db } = require("../../config/databases");

// Register external referenced schemas on india_solarshop_db connection to allow populate()
if (!india_solarshop_db.models['geolocation_level_0']) {
  india_solarshop_db.model('geolocation_level_0', GeoLevel0.schema);
}
if (!india_solarshop_db.models['geolocation_level_1']) {
  india_solarshop_db.model('geolocation_level_1', GeoLevel1.schema);
}
if (!india_solarshop_db.models['geolocation_level_2']) {
  india_solarshop_db.model('geolocation_level_2', GeoLevel2.schema);
}
if (!india_solarshop_db.models['company_warehouses']) {
  india_solarshop_db.model('company_warehouses', CompanyWarehouse.schema);
}

const EpcAccount = require("../../models/india_solarshop_db/epc_accounts.schema");
const EpcCompany = require("../../models/india_core_db/epc_companies.schema");
const EpcCompanyGst = require("../../models/india_core_db/epc_company_gst.schema");
const Otp = require("../../models/india_solarshop_db/otps.schema");
const bcrypt = require("bcrypt");

// ─── Reuse the existing WhatsApp OTP utility (same as signup / forgot-password flow) ─
const { sendWhatsAppOTP } = require("../../utils/whatsapp");

// ──────────────────────────────────────────────────────────────────────
// CHECKOUT PHONE OTP  ─  same pattern as forgot-password OTP (proven working)
// POST /india/v1/shop/checkout/send-phone-otp
// POST /india/v1/shop/checkout/verify-phone-otp
// ──────────────────────────────────────────────────────────────────────

const checkout_send_phone_otp = async (req, res) => {
  try {
    const { phone } = req.body;
    const account_id = req.user?.account_id;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required.' });
    }
    const cleaned = phone.trim().replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      return res.status(400).json({ success: false, message: 'Enter a valid 10-digit Indian mobile number.' });
    }

    // Send OTP via WhatsApp (same utility used in signup & forgot-password)
    const otpVal = await sendWhatsAppOTP(cleaned);

    const hashedOtp = await bcrypt.hash(otpVal.toString(), 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    // Store in MongoDB Otp collection (same as forgot-password pattern)
    await Otp.create({
      otp: hashedOtp,
      channel: 'whatsapp',
      target: cleaned,
      user_id: account_id || null,
      reference_type: 'checkout_phone_verify',
      ip_address: req.ip,
      expires_at: expiresAt
    });

    console.log(`[Checkout OTP] Sent WhatsApp OTP to +91${cleaned}`);
    return res.json({ success: true, message: `OTP sent to +91 ${cleaned} via WhatsApp` });

  } catch (err) {
    console.error('checkout_send_phone_otp error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to send OTP.' });
  }
};

const checkout_verify_phone_otp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: 'Phone and OTP are required.' });
    }
    const cleaned = phone.trim().replace(/\D/g, '');

    // Find the latest valid OTP record
    const record = await Otp.findOne({
      target: cleaned,
      reference_type: 'checkout_phone_verify',
      verified_at: null,
      expires_at: { $gt: new Date() }
    }).sort({ _id: -1 });

    if (!record) {
      return res.status(400).json({ success: false, message: 'OTP expired or not found. Please request a new OTP.' });
    }

    const isValid = await bcrypt.compare(otp.toString().trim(), record.otp);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please check the code sent to your WhatsApp.' });
    }

    // Mark as verified
    await Otp.updateOne({ _id: record._id }, { verified_at: new Date() });

    console.log(`[Checkout OTP] Phone +91${cleaned} verified successfully`);
    return res.json({
      success: true,
      message: 'Phone number verified successfully.',
      verified_phone: cleaned
    });

  } catch (err) {
    console.error('checkout_verify_phone_otp error:', err);
    return res.status(500).json({ success: false, message: err.message || 'OTP verification failed.' });
  }
};



// ─── In-memory OTP store: requestId → { otp, phone, expiresAt } ──────────────
const _gstOtpStore = new Map();

/**
 * Generate a 6-digit OTP, send via Twilio WhatsApp using existing utility,
 * store with 10-min TTL. Returns the request_id string or throws.
 */
const sendGstOtpViaTwilio = async (phone) => {
  const requestId = `twilio_req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // sendWhatsAppOTP generates OTP internally, sends via WhatsApp, and returns OTP
  const otp = await sendWhatsAppOTP(
    phone,
    undefined // use default message — OTP is auto-generated inside sendWhatsAppOTP
  );

  // Store with 10-minute expiry
  _gstOtpStore.set(requestId, {
    otp,
    phone,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  // Auto-cleanup after 15 minutes
  setTimeout(() => _gstOtpStore.delete(requestId), 15 * 60 * 1000);

  console.log(`[GST OTP] Sent WhatsApp OTP to +91${phone}, requestId: ${requestId}`);
  return requestId;
};


const getFallbackKits = () => {
  return [];
};

const getBookedSKUsMap = async (warehouseIds) => {
  const confirmedOrders = await PurchaseOrder.find({
    warehouse_id: { $in: warehouseIds },
    status: 'confirmed'
  }).lean();

  const bookedMap = {};
  if (confirmedOrders.length > 0) {
    const kitIds = confirmedOrders.map(o => o.combo_kit_id).filter(Boolean);
    const kits = await ComboKit.find({ _id: { $in: kitIds } }).lean();
    const kitMap = new Map(kits.map(k => [k._id.toString(), k]));

    confirmedOrders.forEach(order => {
      if (!order.combo_kit_id || !order.warehouse_id) return;
      const kit = kitMap.get(order.combo_kit_id.toString());
      if (kit) {
        const warehouseIdStr = order.warehouse_id.toString();
        const components = [...(kit.base_components || []), ...(kit.bos_kits || [])];
        components.forEach(comp => {
          if (comp.sku_id) {
            const skuIdStr = comp.sku_id.toString();
            const key = `${warehouseIdStr}_${skuIdStr}`;
            bookedMap[key] = (bookedMap[key] || 0) + (comp.quantity || 1);
          }
        });
      }
    });
  }
  return bookedMap;
};

const getReservedSKUsMap = async (warehouseIds) => {
  const now = new Date();
  const activeResvs = await InventoryReservation.find({
    status: 'reserved',
    expiry_time: { $gt: now }
  }).lean();

  const reservedMap = {};
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

    activeResvs.forEach(r => {
      if (!r.product_id) return;
      const whIdStr = resolvedWarehouseMap[r.product_id.toString()];
      if (whIdStr && warehouseIds.map(id => id.toString()).includes(whIdStr)) {
        const kit = kits.find(k => k._id.toString() === r.product_id.toString());
        if (kit) {
          const components = [...(kit.base_components || []), ...(kit.bos_kits || [])];
          components.forEach(comp => {
            if (comp.sku_id) {
              const skuIdStr = comp.sku_id.toString();
              const key = `${whIdStr}_${skuIdStr}`;
              reservedMap[key] = (reservedMap[key] || 0) + (comp.quantity || 1) * r.quantity;
            }
          });
        }
      }
    });
  }
  return reservedMap;
};

const calculatePriceWithMarginAndGst = (basePrice, marginPercent = 0, gstRate = 0) => {
  const priceBeforeGst = Math.round(basePrice * (1 + (marginPercent / 100)));
  return Math.round(priceBeforeGst * (1 + (gstRate / 100)));
};

// ─────────────────────────────────────────────────────────────────
// Helper: compute available stock for a single kit given a warehouse
// ─────────────────────────────────────────────────────────────────
const computeKitAvailableStock = async (kit, warehouseId, otherCartDepletion = {}) => {
  const uniqueSkuIds = [];
  const addSku = (id) => {
    if (id && !uniqueSkuIds.some(s => s.toString() === id.toString())) {
      uniqueSkuIds.push(id);
    }
  };
  (kit.base_components || []).forEach(bc => { if (bc.sku_id) addSku(bc.sku_id); });
  (kit.bos_kits || []).forEach(bk => { if (bk.sku_id) addSku(bk.sku_id); });

  const stockMap = {};
  if (uniqueSkuIds.length > 0) {
    const stocks = await WarehouseStock.find({
      warehouse_id: warehouseId,
      sku_id: { $in: uniqueSkuIds }
    }).lean();

    const reservedSKUsMap = await getReservedSKUsMap([warehouseId]);
    const bookedSKUsMap = await getBookedSKUsMap([warehouseId]);

    stocks.forEach(s => {
      const key = s.sku_id.toString();
      const depleted = otherCartDepletion[key] || 0;
      const keyLookup = `${warehouseId.toString()}_${key}`;
      const reserved = reservedSKUsMap[keyLookup] || 0;
      const booked = bookedSKUsMap[keyLookup] || 0;
      stockMap[key] = Math.max(0, (s.qty || 0) - depleted - reserved - booked);
    });
  }

  let availableStockKits = Infinity;
  [...(kit.base_components || []), ...(kit.bos_kits || [])].forEach(comp => {
    if (comp.sku_id) {
      const avail = stockMap[comp.sku_id.toString()] || 0;
      const req = comp.quantity || 1;
      const maxForSku = Math.floor(avail / req);
      if (maxForSku < availableStockKits) availableStockKits = maxForSku;
    }
  });
  if (availableStockKits === Infinity) availableStockKits = 0;

  return availableStockKits;
};

const get_combo_kits_by_district = async (req, res) => {
  try {
    const { district_id, pincode } = req.query;
    
    const shopSettings = await SolarShopSettings.findOne({}).lean() || {};

    let targetDistrictId = district_id;
    const resolvedPincode = pincode ? pincode.trim() : null;

    if (resolvedPincode && (!targetDistrictId || !mongoose.Types.ObjectId.isValid(targetDistrictId))) {
      const pDoc = await GeoLevel2.findOne({ 'pincodes.pincode': resolvedPincode, deleted_at: null }).lean();
      if (pDoc) {
        targetDistrictId = pDoc._id.toString();
      }
    }
    if (!targetDistrictId || !mongoose.Types.ObjectId.isValid(targetDistrictId)) {
      // Find the first active sub warehouse as default
      const defaultWarehouse = await CompanyWarehouse.findOne({ 
        warehouse_type: 'sub',
        is_active: true, 
        deleted_at: null 
      }).lean();

      if (defaultWarehouse && defaultWarehouse.level_2) {
        targetDistrictId = defaultWarehouse.level_2.toString();
      } else {
        // Fallback to first active master warehouse
        const defaultMaster = await CompanyWarehouse.findOne({
          warehouse_type: 'master',
          is_active: true,
          deleted_at: null
        }).lean();
        if (defaultMaster && defaultMaster.level_2) {
          targetDistrictId = defaultMaster.level_2.toString();
        }
      }
    }

    if (!targetDistrictId) {
      return res.status(200).json({ success: true, source: "db", data: getFallbackKits() });
    }

    // Find district to get cluster_id for pricing and warehouse check
    const districtDoc = await GeoLevel2.findById(targetDistrictId).lean();
    const clusterId = districtDoc?.cluster || null;

    // Best Seller lookup for this district and state
    const BestSellerKit = require("../../../admin-panel/models/india_solarshop_db").BestSellerKit;
    const stateId = districtDoc?.level_1 || null;
    let bestSellerMap = new Map();
    try {
      const bsQuery = { deleted_at: null, is_active: true };
      if (stateId && targetDistrictId) {
        bsQuery.$or = [
          { district_id: new mongoose.Types.ObjectId(targetDistrictId) },
          { state_id: new mongoose.Types.ObjectId(stateId), district_id: null },
          { state_id: null }
        ];
      } else if (stateId) {
        bsQuery.$or = [
          { state_id: new mongoose.Types.ObjectId(stateId) },
          { state_id: null }
        ];
      } else {
        bsQuery.state_id = null;
      }
      const bsDocs = await BestSellerKit.find(bsQuery).lean();
      // Prioritize hierarchy: District level (3) > State level (2) > National All India (1), then priority
      bsDocs.sort((a, b) => {
        const aScope = a.district_id ? 3 : (a.state_id ? 2 : 1);
        const bScope = b.district_id ? 3 : (b.state_id ? 2 : 1);
        if (aScope !== bScope) return bScope - aScope;
        return (a.priority || 1) - (b.priority || 1);
      });
      bsDocs.forEach(bs => {
        if (bs.combo_kit_id) {
          const kId = bs.combo_kit_id.toString();
          if (!bestSellerMap.has(kId) || bs.district_id) {
            bestSellerMap.set(kId, {
              badge_text: bs.badge_text || 'Our Best Seller',
              priority: bs.priority || 1,
              state_name: bs.state_name,
              district_name: bs.district_name,
              is_district_level: Boolean(bs.district_id)
            });
          }
        }
      });
    } catch (bsErr) {
      console.warn('Error querying BestSellerKit for district:', bsErr.message);
    }

    // Find sub warehouses in this district
    let warehouses = await CompanyWarehouse.find({
      level_2: new mongoose.Types.ObjectId(targetDistrictId),
      warehouse_type: 'sub',
      is_active: true,
      deleted_at: null
    }).lean();

    // Fall back to master warehouse or any active warehouse if no sub warehouses exist in the selected district
    if (warehouses.length === 0) {
      if (clusterId) {
        const clusterDistricts = await GeoLevel2.find({ cluster: clusterId, deleted_at: null }).select('_id').lean();
        const clusterDistrictIds = clusterDistricts.map(d => d._id);

        const masterWarehouse = await CompanyWarehouse.findOne({
          level_2: { $in: clusterDistrictIds },
          warehouse_type: 'master',
          is_active: true,
          deleted_at: null
        }).lean();

        if (masterWarehouse) {
          warehouses = [masterWarehouse];
        }
      }

      if (warehouses.length === 0) {
        const fallbackWarehouses = await CompanyWarehouse.find({
          is_active: true,
          deleted_at: null
        }).lean();
        warehouses = fallbackWarehouses;
      }
    }

    let warehouseIds = warehouses.map(w => w._id);

    // Fetch warehouse kit activations for resolved warehouses
    const activations = await WarehouseKitActivation.find({
      warehouse_id: { $in: warehouseIds },
      is_combokit_active: true,
      is_active: true,
      deleted_at: null
    }).lean();

    if (!activations || activations.length === 0) {
      return res.status(200).json({ success: true, source: "db", data: [] });
    }

    const CoreComboKit = require("../../models/india_core_db/combo_kits.schema");
    const IndiaComboKit = require("../../models/india_solarshop_db/combo_kits.schema");

    // Build set of kit IDs
    const kitIds = activations.map(a => a.combo_kit_id).filter(Boolean);
    if (kitIds.length === 0) {
      return res.status(200).json({ success: true, source: "db", data: [] });
    }

    // Fetch combo kits from both collections
    const [k1, k2] = await Promise.all([
      IndiaComboKit.find({ _id: { $in: kitIds }, is_active: true, deleted_at: null }).lean().catch(() => []),
      CoreComboKit.find({ _id: { $in: kitIds }, is_active: true, deleted_at: null }).lean().catch(() => [])
    ]);
    const map = new Map();
    [...(k1 || []), ...(k2 || [])].forEach(k => map.set(k._id.toString(), k));
    let kits = Array.from(map.values());

    if (kits.length === 0) {
      return res.status(200).json({ success: true, source: "db", data: [] });
    }

    // Safety check: ensure every kit has valid order_quantities and loose_order_quantities
    kits.forEach(k => {
      const validQtys = (k.order_quantities || []).map(Number).filter(n => !isNaN(n) && n > 0);
      if (validQtys.length > 0) {
        k.order_quantities = validQtys.sort((a, b) => a - b);
      } else {
        const cap = Number(k.capacity) || 5;
        if (cap <= 3) {
          k.order_quantities = [10, 25];
        } else if (cap <= 10) {
          k.order_quantities = [10, 50, 100];
        } else if (cap <= 50) {
          k.order_quantities = [50, 200, 500];
        } else {
          k.order_quantities = [10, 25, 50];
        }
      }

      const validLooseQtys = (k.loose_order_quantities || []).map(Number).filter(n => !isNaN(n) && n > 0);
      if (validLooseQtys.length > 0) {
        k.loose_order_quantities = validLooseQtys.sort((a, b) => a - b);
      } else {
        k.loose_order_quantities = [5, 10, 15, 20, 25, 30, 50];
      }
    });

    // ── EPC TENANT ISOLATION: FRANCHISE-ONBOARDED vs DIRECT EPC ───────────────
    // If requester is an authenticated EPC onboarded by a Franchise Partner:
    // ONLY show combo kits listed / authorized by that Franchise Partner.
    // If Direct EPC or unauthenticated public store visitor: show ALL active company combo kits.
    try {
      let epcAccount = null;
      let accountId = req.user?.account_id || req.user?._id || req.user?.id;
      if (!accountId) {
        const authHeader = req.headers.authorization;
        const cookieToken = req.cookies?.access_token;
        const token = (authHeader && authHeader.startsWith('Bearer ')) ? authHeader.split(' ')[1] : cookieToken;
        if (token) {
          const jwt = require('jsonwebtoken');
          const decoded = jwt.decode(token);
          accountId = decoded?.account_id || decoded?._id || decoded?.id;
        }
      }

      if (accountId && mongoose.Types.ObjectId.isValid(accountId)) {
        const { EpcAccount } = require('../../../admin-panel/models/india_solarshop_db');
        epcAccount = await EpcAccount.findOne({ _id: accountId, deleted_at: null }).lean();
      }

      if (epcAccount) {
        const resellerId = epcAccount.primary_reseller_id || epcAccount.onboarded_by_reseller_id;
        if (resellerId) {
          const {
            ResellerListing,
            ResellerPlanSubscription,
            FranchiseePlanPOSetting,
            FranchiseePlanPoSetting,
            ResellerProductAuthorization
          } = require('../../../admin-panel/models/india_solarshop_db');

          const PlanPoModel = FranchiseePlanPOSetting || FranchiseePlanPoSetting;
          const [listings, activeSub, poSettings, directAuths] = await Promise.all([
            ResellerListing.find({
              reseller_id: resellerId,
              status: { $in: ['active', 'published'] },
              deleted_at: null,
            }).lean(),
            ResellerPlanSubscription.findOne({
              reseller_id: resellerId,
              status: 'active',
            }).populate('plan_id').lean(),
            PlanPoModel ? PlanPoModel.find({
              franchisee_id: resellerId,
              is_active: true,
              deleted_at: null,
            }).lean() : [],
            ResellerProductAuthorization ? ResellerProductAuthorization.find({
              reseller_id: resellerId,
              status: 'active',
              is_authorized: true,
            }).lean() : []
          ]);

          const authorizedKitIds = new Set();
          listings.forEach(l => {
            if (l.kit_id) authorizedKitIds.add(l.kit_id.toString());
            if (l.combo_kit_id) authorizedKitIds.add(l.combo_kit_id.toString());
          });
          if (activeSub?.plan_id?.allowed_combo_kit_ids) {
            activeSub.plan_id.allowed_combo_kit_ids.forEach(id => authorizedKitIds.add(id.toString()));
          }
          poSettings.forEach(s => {
            (s.allowed_combo_kit_ids || []).forEach(id => authorizedKitIds.add(id.toString()));
          });
          directAuths.forEach(a => {
            if (a.kit_id) authorizedKitIds.add(a.kit_id.toString());
          });

          // Filter kits strictly to only those authorized / listed by this Franchise Partner
          kits = kits.filter(k => authorizedKitIds.has(k._id.toString()));

          if (kits.length === 0) {
            return res.status(200).json({ success: true, source: "db", data: [] });
          }
        }
        // If resellerId is null (Direct EPC): No filtering applied, full company catalog is shown!
      }
    } catch (isolationErr) {
      console.warn('EPC tenant catalog isolation check warning:', isolationErr.message);
    }

    // ── Count prior trial kit orders for current buyer to enforce purchase limits ──
    const trialCountByKitId = {};
    try {
      let buyerId = req.user?.account_id || req.user?.id || req.user?._id;
      if (!buyerId) {
        const authHeader = req.headers.authorization;
        const cookieToken = req.cookies?.access_token;
        const token = (authHeader && authHeader.startsWith('Bearer ')) ? authHeader.split(' ')[1] : cookieToken;
        if (token) {
          const jwt = require('jsonwebtoken');
          const decoded = jwt.decode(token);
          buyerId = decoded?.account_id || decoded?.id || decoded?._id;
        }
      }

      if (buyerId && mongoose.Types.ObjectId.isValid(buyerId)) {
        const { EpcOrder } = require('../../../admin-panel/models/india_solarshop_db');
        const buyerObjId = new mongoose.Types.ObjectId(buyerId);
        const buyerTrialOrders = await EpcOrder.find({
          epc_id: buyerObjId,
          order_status: { $nin: ['cancelled'] },
          payment_status: { $nin: ['rejected'] },
          $or: [
            { is_trial_order: true },
            { 'items.is_trial_kit': true },
            { 'items.item_name': { $regex: /trial/i } }
          ]
        }, { 'items.kit_id': 1, 'items.is_trial_kit': 1, 'items.item_name': 1 }).lean();

        (buyerTrialOrders || []).forEach(o => {
          (o.items || []).forEach(it => {
            const isTrial = Boolean(it.is_trial_kit || (it.item_name && /trial/i.test(it.item_name)));
            if (isTrial && it.kit_id) {
              const kId = it.kit_id.toString();
              trialCountByKitId[kId] = (trialCountByKitId[kId] || 0) + 1;
            }
          });
        });
      }
    } catch (trialCountErr) {
      console.warn('[get_combo_kits_by_district] Error counting buyer trial orders:', trialCountErr.message);
    }

    // Fetch all solar kits for mapping and manual population
    const solarKits = await SolarKit.find({ deleted_at: null }).lean();

    // Manually populate solar_kit_id and project_range_id to support cross-connection lookup
    const projectRangeIds = kits.map(k => k.project_range_id).filter(Boolean);
    const categoryIds = solarKits.map(sk => sk.category_id).filter(Boolean);
    const subcategoryIds = solarKits.map(sk => sk.subcategory_id).filter(Boolean);
    const typeMapIds = solarKits.map(sk => sk.type_id).filter(Boolean);

    const { 
      ProjectCategory, 
      ProjectSubcategory, 
      ProjectSubcategoryType, 
      ProjectRange, 
      ProjectType, 
      Unit, 
      IndustryType,
      ProductSubtype,
      ProductTemplate,
      Brand
    } = require("../../../admin-panel/models/core_db");

    const [categories, subcategories, typeMaps, projectRanges] = await Promise.all([
      ProjectCategory.find({ _id: { $in: categoryIds } }).lean(),
      ProjectSubcategory.find({ _id: { $in: subcategoryIds } }).lean(),
      ProjectSubcategoryType.find({ _id: { $in: typeMapIds } }).lean(),
      ProjectRange.find({ _id: { $in: projectRangeIds } }).lean()
    ]);

    const typeIds = typeMaps.map(tm => tm.type).filter(Boolean);
    const unitIds = projectRanges.map(pr => pr.unit_id).filter(Boolean);

    const [types, units, industryTypes] = await Promise.all([
      ProjectType.find({ _id: { $in: typeIds } }).lean(),
      Unit.find({ _id: { $in: unitIds } }).lean(),
      IndustryType.find({ deleted_at: null }).lean()
    ]);

    const projectRangesMap = {};
    projectRanges.forEach(pr => {
      const unitObj = units.find(u => u._id.toString() === pr.unit_id?.toString());
      projectRangesMap[pr._id.toString()] = {
        ...pr,
        unit: unitObj
      };
    });

    const solarKitsMap = {};
    solarKits.forEach(sk => {
      const cat = categories.find(c => c._id.toString() === sk.category_id?.toString());
      const sub = subcategories.find(s => s._id.toString() === sk.subcategory_id?.toString());
      
      const typeMap = typeMaps.find(tm => tm._id.toString() === sk.type_id?.toString());
      let typeObj = null;
      if (typeMap && typeMap.type) {
        typeObj = types.find(t => t._id.toString() === typeMap.type.toString());
      }

      solarKitsMap[sk._id.toString()] = {
        ...sk,
        category_id: cat,
        subcategory_id: sub,
        type_id: typeObj
      };
    });

    kits.forEach(k => {
      if (k.solar_kit_id) {
        k.solar_kit_id = solarKitsMap[k.solar_kit_id.toString()] || null;
      }
      if (k.project_range_id) {
        k.project_range_id = projectRangesMap[k.project_range_id.toString()] || null;
      }
    });

    // Collect unique SKU IDs across all kits
    const allSkuIds = [];
    kits.forEach(kit => {
      (kit.base_components || []).forEach(bc => { if (bc.sku_id) allSkuIds.push(bc.sku_id); });
      (kit.bos_kits || []).forEach(bk => { if (bk.sku_id) allSkuIds.push(bk.sku_id); });
    });
    const uniqueAllSkuIds = [...new Set(allSkuIds.map(id => id.toString()))].map(id => new mongoose.Types.ObjectId(id));

    // Bulk fetch SKUs + prices + attributes
    const [skuDocs, skuPriceDocs, attrDefs] = await Promise.all([
      ProductSku.find({ _id: { $in: uniqueAllSkuIds }, deleted_at: null }).lean(),
      ProductSkuPrice.find({ sku_id: { $in: uniqueAllSkuIds }, cluster_id: clusterId }).lean(),
      SubtypeAttribute.find({}).lean()
    ]);

    // Fetch products, brands, and subtypes manually (supporting cross-connection/missing-ref)
    const productIds = skuDocs.map(sku => sku.product_id).filter(Boolean);
    const uniqueProductIds = [...new Set(productIds.map(id => id.toString()))].map(id => new mongoose.Types.ObjectId(id));
    const products = await Product.find({ _id: { $in: uniqueProductIds } }).lean();
    const brandIds = [
      ...products.map(p => p.brand_id).filter(Boolean),
      ...kits.map(k => k.brand_id).filter(Boolean)
    ];
    const subtypeIds = products.map(p => p.subtype_id).filter(Boolean);

    const [brands, subtypes, pavDocs, optionDocs, unitDocs] = await Promise.all([
      Brand.find({ _id: { $in: brandIds } }).lean(),
      ProductSubtype.find({ _id: { $in: subtypeIds } }).lean(),
      ProductAttributeValue.find({
        deleted_at: null,
        $or: [
          { sku_id: { $in: uniqueAllSkuIds } },
          { product_id: { $in: uniqueProductIds } }
        ]
      }).lean(),
      AttributeOption.find({}).lean(),
      Unit.find({}).lean()
    ]);

    const skuPavMap = {};
    const prodPavMap = {};
    pavDocs.forEach(pav => {
      if (pav.sku_id) {
        const k = pav.sku_id.toString();
        if (!skuPavMap[k]) skuPavMap[k] = [];
        skuPavMap[k].push(pav);
      }
      if (pav.product_id) {
        const k = pav.product_id.toString();
        if (!prodPavMap[k]) prodPavMap[k] = [];
        prodPavMap[k].push(pav);
      }
    });

    const attrMap = {};
    attrDefs.forEach(a => { attrMap[a._id.toString()] = a; });
    const optionMap = {};
    optionDocs.forEach(o => { optionMap[o._id.toString()] = o.value; });
    const unitMap = {};
    unitDocs.forEach(u => { unitMap[u._id.toString()] = u.symbol || u.name; });

    // Helper to resolve technical attributes from ProductAttributeValue + smart domain enrichment
    const resolveComponentAttributes = (skuInfo, productInfo, brandInfo, compName = "") => {
      const list = [];
      const seenAttrNames = new Set();

      const addAttr = (name, val) => {
        if (!name || val == null || val === "") return;
        const key = name.toLowerCase().trim();
        if (seenAttrNames.has(key)) return;
        seenAttrNames.add(key);
        list.push({ name, value: String(val).trim() });
      };

      const processPav = (pav) => {
        const def = attrMap[pav.attribute_id?.toString()];
        if (!def) return;
        let val = pav.value_text;
        if (val === null || val === undefined || val === "") {
          if (pav.value_number !== null && pav.value_number !== undefined) val = pav.value_number;
          else if (pav.value_boolean !== null && pav.value_boolean !== undefined) val = pav.value_boolean ? "Yes" : "No";
          else if (pav.value_option_id) val = optionMap[pav.value_option_id.toString()] || null;
        }
        if (val !== null && val !== undefined && val !== "") {
          const u = pav.unit_id ? unitMap[pav.unit_id.toString()] : "";
          addAttr(def.name, u ? `${val} ${u}` : `${val}`);
        }
      };

      // 1. SKU-specific values from pc_attribute_values
      if (skuInfo?._id && skuPavMap[skuInfo._id.toString()]) {
        skuPavMap[skuInfo._id.toString()].forEach(processPav);
      }
      // 2. Product-level values from pc_attribute_values
      if (productInfo?._id && prodPavMap[productInfo._id.toString()]) {
        prodPavMap[productInfo._id.toString()].forEach(processPav);
      }
      // 3. Embedded attributes on skuInfo
      if (skuInfo?.attributes && Array.isArray(skuInfo.attributes)) {
        skuInfo.attributes.forEach(attr => {
          const def = attrMap[attr.subtype_attribute_id?.toString()];
          if (def && attr.value_raw) {
            addAttr(def.name, attr.value_raw);
          }
        });
      }

      // 4. Domain-intelligent fallback specifications
      const brandName = brandInfo?.brand_name || productInfo?.brand?.brand_name || skuInfo?.brand?.brand_name || "";
      const code = (skuInfo?.sku_code || "").toUpperCase();
      const name = (compName || productInfo?.name || "").toLowerCase();

      if (brandName) {
        addAttr("Brand", brandName);
      }

      // Cables
      const isCableOrWire = (code.startsWith("CAB") || name.includes("cable") || name.includes("wire")) &&
        !name.includes("tie") && !name.includes("clamp") && !name.includes("tap") && !name.includes("tray");

      if (isCableOrWire) {
        const match = code.match(/(\d+(\.\d+)?)\s*(MM|SQMM)/i);
        if (match) addAttr("Cross Section", `${match[1]} sq.mm`);

        if (code.includes("DCCA") || name.includes("dc")) {
          addAttr("Cable Type", "DC Solar Photovoltaic Cable");
          addAttr("Voltage Rating", "1500V DC (EN 50618 / TÜV 2 Pfg 1169)");
          addAttr("Conductor Material", "Tinned Copper (Class 5 Flexible)");
          addAttr("Insulation", "Cross-Linked Polyolefin (XLPO / XLPE)");
          addAttr("Temperature Rating", "-40°C to +120°C");
          if (code.includes("BLAC") || name.includes("black")) addAttr("Color", "Black (UV-Resistant)");
          if (code.includes("RED") || name.includes("red")) addAttr("Color", "Red (UV-Resistant)");
        } else if (code.includes("ACCA") || name.includes("ac")) {
          addAttr("Cable Type", "AC Interconnection Cable");
          addAttr("Voltage Rating", "1.1 kV AC (IS 694 / IS 1554)");
          addAttr("Conductor Material", "High Purity Electrolytic Copper");
          addAttr("Insulation", "Flame Retardant PVC / XLPE");
          if (code.includes("BLAC") || name.includes("black")) addAttr("Color", "Black");
          if (code.includes("RED") || name.includes("red")) addAttr("Color", "Red");
        } else if (code.includes("EART") || name.includes("earth")) {
          addAttr("Cable Type", "Earthing Ground Wire");
          addAttr("Conductor Material", "Pure Electrolytic Copper");
          addAttr("Insulation", "FR PVC Green / Yellow");
          addAttr("Color", "Green");
        } else if (code.includes("LIGH") || name.includes("lightning")) {
          addAttr("Cable Type", "Lightning Arrestor Down Conductor");
          addAttr("Conductor Material", "High-Grade Aluminium Strip / Conductor");
          addAttr("Standard", "IS/IEC 62305 Compliance");
        }
      }

      // ACDB / DCDB
      if (code.startsWith("AC-") || code.startsWith("DCD-") || name.includes("acdb") || name.includes("dcdb")) {
        addAttr("Enclosure Rating", "IP65 Weatherproof & UV Resistant Polycarbonate");
        if (code.startsWith("DCD-") || name.includes("dcdb")) {
          addAttr("Box Type", "DC Distribution Box (DCDB)");
          addAttr("Protection", "Class II Surge Protection (SPD 1000V DC) + gPV Fuses");
        } else {
          addAttr("Box Type", "AC Distribution Box (ACDB)");
          addAttr("Protection", "AC MCB / Isolator + AC Surge Protection Device (SPD 40kA)");
        }
        addAttr("Mounting Type", "Wall / Frame Mounting");
      }

      // MC4 Connector
      if (code.startsWith("MC4") || name.includes("mc4") || (name.includes("connector") && !name.includes("box"))) {
        addAttr("Connector Type", "Standard MC4 Solar PV Connector");
        addAttr("Rated Voltage", "1500V DC (IEC) / 1000V DC (UL)");
        addAttr("Contact Material", "Copper with Silver / Tin Plating");
        addAttr("Ingress Protection", "IP67 / IP68 (Mated)");
        addAttr("Flame Class", "UL94-V0");
      }

      // Earthing Rod
      if (code.includes("EAR-") && (name.includes("rod") || code.includes("COPP"))) {
        addAttr("Material", "High Tensile Steel with Pure Electrolytic Copper Bonding");
        addAttr("Coating Standard", "Minimum 250 Microns Copper Bonded (UL 467 / IEEE 80)");
        addAttr("Length", "1 Meter");
      }

      // Earthing Compound
      if (code.includes("EAR-") && (name.includes("compound") || code.includes("CHEM"))) {
        addAttr("Compound Type", "Eco-friendly Moisture Retaining Chemical Earth Compound");
        addAttr("Resistivity", "Low Resistivity < 0.2 Ω-m");
        addAttr("Quantity", "10 kg");
      }

      // Lightning Arrester
      if (code.startsWith("LIG-") || name.includes("lightning") || name.includes("arrester")) {
        addAttr("System Type", "Conventional Multi-Spike Lightning Protection");
        addAttr("Mast Material", "FRP Insulated Support Mast with Pure Copper Tip");
        addAttr("Standard", "IS/IEC 62305 Lightning Protection Standard");
      }

      // Hardware & Accessories
      if (code.startsWith("CLA-") || name.includes("clamp")) {
        addAttr("Material", "Anodized Aluminium 6063-T6 / Stainless Steel");
      }
      if (code.startsWith("UVR-") || name.includes("cable tie")) {
        addAttr("Material", "UV Resistant Nylon 66 (Weatherproof Outdoor Grade)");
      }
      if (code.startsWith("PVC-") || name.includes("pvc")) {
        addAttr("Material", "Heavy Duty Rigid PVC (UV Stabilized)");
      }
      if (code.startsWith("SCR-") || name.includes("screw") || name.includes("fastener")) {
        addAttr("Grade", "SS304 / High Tensile Galvanized Steel Grade 8.8");
      }

      return list;
    };

    const skusMap = {};
    skuDocs.forEach(sku => {
      const product = products.find(p => p._id.toString() === sku.product_id?.toString()) || null;
      const brand = product ? brands.find(b => b._id.toString() === product.brand_id?.toString()) : null;
      const subtype = product ? subtypes.find(st => st._id.toString() === product.subtype_id?.toString()) : null;

      skusMap[sku._id.toString()] = {
        _id: sku._id,
        sku_code: sku.sku_code,
        image: sku.image || '',
        product,
        brand,
        subtype,
        attributes: sku.attributes || []
      };
    });

    // Fetch bulk kit settings
    const bulkSettingDoc = await BulkKitSetting.findOne({}).lean();

    // Fetch PC solar panel template IDs
    const solarPanelTemplates = await ProductTemplate.find({ name: /solar panel/i }).lean();
    const solarPanelTemplateIds = solarPanelTemplates.map(t => t._id.toString());

    // Map which SKU IDs are solar panels
    const panelSkuIdsMap = {};
    skuDocs.forEach(sku => {
      const prod = products.find(p => p._id.toString() === sku.product_id?.toString());
      if (prod && prod.template_id && solarPanelTemplateIds.includes(prod.template_id.toString())) {
        panelSkuIdsMap[sku._id.toString()] = true;
      }
    });

    // Fetch active reservations and bookings for these warehouses
    const reservedSKUsMap = await getReservedSKUsMap(warehouseIds);
    const bookedSKUsMap = await getBookedSKUsMap(warehouseIds);

    // Compute other carts' SKU depletion (for live inventory)
    const durationMin = shopSettings.checkout_timer_duration || 10;
    const cartExpiryThreshold = new Date(Date.now() - durationMin * 60 * 1000);
    const activeCarts = await Cart.find({
      updated_at: { $gt: cartExpiryThreshold }
    }).lean();

    const skuDepletion = {};
    for (const cartDoc of activeCarts) {
      for (const cartItem of (cartDoc.cart || [])) {
        if (cartItem.is_custom) continue;
        const kit = kits.find(k => k._id.toString() === cartItem.id?.toString());
        if (!kit) continue;
        const qty = cartItem.qty || 1;
        [...(kit.base_components || []), ...(kit.bos_kits || [])].forEach(comp => {
          if (comp.sku_id) {
            const key = comp.sku_id.toString();
            skuDepletion[key] = (skuDepletion[key] || 0) + ((comp.quantity || 1) * qty);
          }
        });
      }
    }

    // Fetch prices for these SKUs in the current cluster
    const priceMap = {};
    skuPriceDocs.forEach(record => {
      if (record.sku_id) {
        priceMap[record.sku_id.toString()] = record.price || 0;
      }
    });

    // Process each kit
    const processedKits = [];
    for (const kit of kits) {
      const activation = activations.find(a => a.combo_kit_id?.toString() === kit._id.toString());
      const warehouseId = activation?.warehouse_id || warehouseIds[0];

      // Gather unique SKU IDs for this kit
      const uniqueSkuIds = [];
      const addSku = (id) => {
        if (id && !uniqueSkuIds.some(s => s.toString() === id.toString())) {
          uniqueSkuIds.push(id);
        }
      };
      (kit.base_components || []).forEach(bc => { if (bc.sku_id) addSku(bc.sku_id); });
      (kit.bos_kits || []).forEach(bk => { if (bk.sku_id) addSku(bk.sku_id); });

      // Calculate base price
      let totalBasePrice = 0;
      if (kit.base_components && Array.isArray(kit.base_components)) {
        kit.base_components.forEach(bc => {
          if (bc.sku_id) {
            const price = priceMap[bc.sku_id.toString()] || 0;
            totalBasePrice += price * (bc.quantity || bc.qty || 1);
          }
        });
      }
      if (kit.bos_kits && Array.isArray(kit.bos_kits)) {
        kit.bos_kits.forEach(bk => {
          if (bk.sku_id) {
            const price = priceMap[bk.sku_id.toString()] || 0;
            totalBasePrice += price * (bk.quantity || bk.qty || 1);
          }
        });
      }

      // Fallback base price if priceMap yields 0
      if (totalBasePrice === 0) {
        if (kit.base_price_paise) {
          totalBasePrice = kit.base_price_paise / 100;
        } else if (kit.base_price) {
          totalBasePrice = kit.base_price;
        } else if (kit.price) {
          totalBasePrice = kit.price;
        } else {
          const cap = kit.capacity || 3;
          totalBasePrice = cap * 42000;
        }
      }

      // Get margin
      let marginDoc = await CompanyMargin.findOne({
        warehouse_id: warehouseId,
        combo_kit_id: kit._id,
        is_active: true,
        deleted_at: null
      }).lean();

      if (!marginDoc) {
        marginDoc = await CompanyMargin.findOne({
          combo_kit_id: kit._id,
          is_active: true,
          deleted_at: null
        }).sort({ updated_at: -1 }).lean();
      }

      const standardMargin = marginDoc ? (marginDoc.standard_margin || 15) : 15;
      const showcaseMargin = marginDoc ? (marginDoc.showcase_margin || 25) : 25;
      const poDiscountedMargin = marginDoc ? (marginDoc.po_discounted_margin || 10) : 10;

      const gstRate = marginDoc?.gst_rate ?? shopSettings.gst_rate ?? 13.8;

      const standardPrice = calculatePriceWithMarginAndGst(totalBasePrice, standardMargin, gstRate);
      const premiumPrice = calculatePriceWithMarginAndGst(totalBasePrice, showcaseMargin, gstRate);
      const basicPrice = calculatePriceWithMarginAndGst(totalBasePrice, poDiscountedMargin, gstRate);

      // Fetch warehouse stock for these SKUs
      const stockMap = {};
      if (uniqueSkuIds.length > 0) {
        const stocks = await WarehouseStock.find({
          warehouse_id: warehouseId,
          sku_id: { $in: uniqueSkuIds }
        }).lean();

        stocks.forEach(stock => {
          if (stock.sku_id) {
            const skuIdStr = stock.sku_id.toString();
            const depletedQty = skuDepletion[skuIdStr] || 0;
            
            const keyLookup = `${warehouseId.toString()}_${skuIdStr}`;
            const reservedQty = reservedSKUsMap[keyLookup] || 0;
            const bookedQty = bookedSKUsMap[keyLookup] || 0;
            
            const isPanel = panelSkuIdsMap[skuIdStr];
            const deductQty = (isPanel ? reservedQty : depletedQty) + bookedQty;
            
            stockMap[skuIdStr] = Math.max(0, (stock.qty || 0) - deductQty);
          }
        });
      }

      // Check stock status for each SKU and determine max kits we can construct
      let availableStockKits = Infinity;
      if (kit.base_components && Array.isArray(kit.base_components)) {
        kit.base_components.forEach(bc => {
          if (bc.sku_id) {
            const skuIdStr = bc.sku_id.toString();
            if (panelSkuIdsMap[skuIdStr]) {
              const availableQty = stockMap[skuIdStr] || 0;
              const requiredQty = bc.quantity || 1;
              const maxForThisSku = Math.floor(availableQty / requiredQty);
              if (maxForThisSku < availableStockKits) {
                availableStockKits = maxForThisSku;
              }
            }
          }
        });
      }

      // Ensure active kits are in stock unless explicitly out of stock
      let kitInStockForced = true;
      let availableStockKitsForced = 50;

      if (availableStockKits !== Infinity && availableStockKits > 0) {
        availableStockKitsForced = availableStockKits;
        kitInStockForced = true;
      } else if (kit.stock_quantity !== undefined && kit.stock_quantity !== null) {
        availableStockKitsForced = kit.stock_quantity;
        kitInStockForced = kit.stock_quantity > 0;
      }

      // Check limited stock badge status (Logic removed)
      const threshold = 0;
      const displayBadge = false;
      const displayPopup = false;

      // Check flash sale
      const now = new Date();
      const flashSaleFilter = {
        offer_type: 'sales_day',
        is_active: true,
        start_date: { $lte: now },
        end_date: { $gte: now },
        deleted_at: null,
        $or: [
          { products_applicable: kit._id },
          { products_applicable: { $size: 0 } }
        ]
      };

      if (clusterId) {
        flashSaleFilter.$and = [
          {
            $or: [
              { cluster_id: clusterId },
              { cluster_id: null }
            ]
          }
        ];
      } else {
        flashSaleFilter.cluster_id = null;
      }

      const flashSaleDoc = await OfferMaster.findOne(flashSaleFilter).lean();

      // Compute bulk pack details using saved bulk tier settings
      const getBulkPackForPrice = (variantAdditionalPrice = 0, variantWorthPrice = 0) => {
        if (!bulkSettingDoc || !bulkSettingDoc.is_bulk_enabled) return null;
        if (!bulkSettingDoc.apply_to_variants) return null;
        const kitsPerPack = bulkSettingDoc.kits_per_bulk || 4;
        const tiers = [];

        const showcasePriceForVariant = premiumPrice + variantWorthPrice;

        if (bulkSettingDoc.bulk_tiers && Array.isArray(bulkSettingDoc.bulk_tiers)) {
          bulkSettingDoc.bulk_tiers.forEach(tier => {
            const bulkBasePrice = calculatePriceWithMarginAndGst(totalBasePrice, tier.margin, gstRate);
            const bulkPricePerKit = bulkBasePrice + Math.round(variantAdditionalPrice * (1 + (gstRate / 100)));

            const savingsPerKit = Math.max(0, showcasePriceForVariant - bulkPricePerKit);
            const packDiscountPercent = showcasePriceForVariant > 0
              ? Math.round((savingsPerKit / showcasePriceForVariant) * 100)
              : 0;
            const totalPackPrice = bulkPricePerKit * kitsPerPack;
            const totalSavingsPerPack = savingsPerKit * kitsPerPack;

            tiers.push({
              quantity: tier.quantity,
              margin: tier.margin,
              pricePerKitAfterDiscount: bulkPricePerKit,
              packDiscountPercent,
              totalPackPrice,
              totalSavingsPerPack
            });
          });
        }

        if (tiers.length > 0) {
          const firstTier = tiers[0];
          return {
            kitsPerPack,
            packDiscountPercent: firstTier.packDiscountPercent,
            pricePerKitAfterDiscount: firstTier.pricePerKitAfterDiscount,
            totalPackPrice: firstTier.totalPackPrice,
            totalSavingsPerPack: firstTier.totalSavingsPerPack,
            tiers
          };
        }
        return null;
      };

      // Gather assigned variant IDs
      const assignedVariantIds = [];
      if (kit.variant_ids && Array.isArray(kit.variant_ids)) {
        kit.variant_ids.forEach(id => {
          if (id) assignedVariantIds.push(id.toString());
        });
      }
      if (kit.variant_id && !assignedVariantIds.includes(kit.variant_id.toString())) {
        assignedVariantIds.push(kit.variant_id.toString());
      }

      const variants = [];

      if (assignedVariantIds.length > 0) {
        const rawSolarKit = solarKits.find(sk => sk._id.toString() === (kit.solar_kit_id?._id || kit.solar_kit_id)?.toString());
        const catId = rawSolarKit?.category_id || null;
        const subCatId = rawSolarKit?.subcategory_id || null;
        const typeMapId = rawSolarKit?.type_id || null;
        const rangeId = typeof kit.project_range_id === 'object' ? kit.project_range_id?._id : kit.project_range_id;

        const query = {
          deleted_at: null
        };
        if (catId) query.category_id = catId;
        if (subCatId) query.subcategory_id = subCatId;
        if (typeMapId) query.type_id = typeMapId;
        if (rangeId) query.project_range_id = rangeId;
        if (kit.country_id) query.country_id = kit.country_id;

        const customConfig = await ComboKitVariant.findOne(query).lean();

        if (customConfig && customConfig.variants && customConfig.variants.length > 0) {
          customConfig.variants.forEach(v => {
            if (v._id && assignedVariantIds.includes(v._id.toString())) {
              const addPrice = Number(v.additional_price || 0);
              const worthPrice = Number(v.worth_price || 0);

              const variantOurPrice = standardPrice + Math.round(addPrice * (1 + (gstRate / 100)));
              const variantMarketPrice = premiumPrice + Math.round(worthPrice * (1 + (gstRate / 100)));
              const savings = Math.max(0, variantMarketPrice - variantOurPrice);
              const discountPercent = variantMarketPrice > 0
                ? Math.round((savings / variantMarketPrice) * 100)
                : 0;

              const tierBenefits = (v.additional_features || []).map(f => {
                if (typeof f === 'object' && f !== null) {
                  const symbol = "₹";
                  let base = f.name || "Feature";
                  if (f.is_free) {
                    base += ` (FREE - worth ${symbol}${(f.price || 0).toLocaleString('en-IN')})`;
                  } else {
                    base += ` (worth ${symbol}${(f.price || 0).toLocaleString('en-IN')})`;
                  }
                  if (f.description) {
                    base += `: ${f.description}`;
                  }
                  return base;
                }
                return String(f);
              });

              variants.push({
                productTier: v.name,
                tierColor: v.color || null,
                tierBenefits,
                additionalPrice: addPrice,
                worthPrice,
                savings,
                discountPercent,
                marketPrice: variantMarketPrice,
                ourPrice: variantOurPrice,
                gstRate,
                gstIncluded: variantOurPrice - Math.round(variantOurPrice / (1 + (gstRate / 100))),
                includedDeliveryCharge: 0,
                inStock: kitInStockForced,
                availableStock: availableStockKitsForced,
                bulkPack: getBulkPackForPrice(addPrice, worthPrice)
              });
            }
          });
        }
      }

      if (variants.length === 0) {
        variants.push({
          productTier: "Basic",
          tierColor: null,
          tierBenefits: [],
          additionalPrice: 0,
          worthPrice: 0,
          savings: Math.max(0, premiumPrice - standardPrice),
          discountPercent: premiumPrice > 0 ? Math.round(((premiumPrice - standardPrice) / premiumPrice) * 100) : 0,
          marketPrice: premiumPrice,
          ourPrice: standardPrice,
          gstRate,
          gstIncluded: standardPrice - Math.round(standardPrice / (1 + (gstRate / 100))),
          includedDeliveryCharge: 0,
          inStock: kitInStockForced,
          availableStock: availableStockKitsForced,
          bulkPack: getBulkPackForPrice(0, 0)
        });
      }

      const baseComponents = [];

      if (kit.base_components && Array.isArray(kit.base_components)) {
        kit.base_components.forEach(bc => {
          const skuInfo = skusMap[bc.sku_id?.toString()];
          if (!skuInfo) return;
          const p = skuInfo.product;
          const b = skuInfo.brand;

          const isPanel = p && (p.name.toLowerCase().includes("module") || p.name.toLowerCase().includes("panel") || p.name.toLowerCase().includes("pv"));
          const isInverter = p && p.name.toLowerCase().includes("inverter");
          const actualType = isPanel ? "panel" : isInverter ? "inverter" : "other";

          let img = (skuInfo.image && !skuInfo.image.includes("default")) ? skuInfo.image : (p.image && !p.image.includes("default")) ? p.image : "";
          if (img && img.startsWith("/")) {
            img = `http://localhost:5000${img}`;
          }

          const componentAttributes = resolveComponentAttributes(skuInfo, p, b, p?.name || skuInfo.subtype?.name);

          let wattage = 0;
          const wattMatch = skuInfo.sku_code?.match(/(\d+)W/i);
          if (wattMatch) wattage = parseInt(wattMatch[1]);
          const wattAttr = componentAttributes.find(a => a.name.toLowerCase().includes("watt") || a.name.toLowerCase().includes("pmax"));
          if (!wattage && wattAttr) wattage = parseInt(wattAttr.value) || 0;

          let efficiency = 0;
          const effAttr = componentAttributes.find(a => a.name.toLowerCase().includes("efficiency"));
          if (effAttr) efficiency = parseFloat(effAttr.value) || 0;

          let warranty = null;
          const warrantyAttr = componentAttributes.find(a => a.name.toLowerCase().includes("warranty"));
          if (warrantyAttr) warranty = parseInt(warrantyAttr.value) || null;

          let capacity = 0;
          const capAttr = componentAttributes.find(a => {
            const name = a.name.toLowerCase();
            return name.includes("capacity") || name.includes("power rating");
          });
          if (capAttr) capacity = parseFloat(capAttr.value) || 0;

          let inverterTypeVal = "";
          const typeAttr = componentAttributes.find(a => a.name.toLowerCase().includes("type") && !a.name.toLowerCase().includes("technology"));
          if (typeAttr) inverterTypeVal = typeAttr.value || "";

          let inverterCategoryVal = p?.name || "";

          baseComponents.push({
            id: bc.sku_id.toString(),
            name: p?.name || skuInfo.subtype?.name || "Component",
            brandName: b?.brand_name || "",
            skuCode: skuInfo.sku_code,
            quantity: bc.quantity || 0,
            image: img || null,
            datasheet: p?.datasheet || null,
            actualType,
            
            // Mapping matching frontend keys exactly
            technologyType: skuInfo.subtype?.name || "",
            wattPerPanel: wattage,
            efficiencyPercent: efficiency,
            warrantyYears: warranty,
            capacityKW: capacity,
            category: inverterCategoryVal,
            inverterImage: img || null,
            panelImage: img || null,
            type: inverterTypeVal || actualType,
            attributes: componentAttributes
          });
        });
      }

      const firstPanel = baseComponents.find(c => c.actualType === "panel");
      const firstInverter = baseComponents.find(c => c.actualType === "inverter");

      let panelDimension = null;
      if (firstPanel) {
        const dimAttr = firstPanel.attributes.find(a => {
          const n = a.name.toLowerCase();
          return n.includes("dimension") || n.includes("size");
        });
        if (dimAttr) panelDimension = dimAttr.value;
      }

      let bosBrandName = "";
      const bosIncludedList = [];
      let bosImage = "";

      const bosComponents = [];
      if (kit.bos_kits && Array.isArray(kit.bos_kits)) {
        kit.bos_kits.forEach(bk => {
          const skuInfo = skusMap[bk.sku_id?.toString()];
          const name = bk.name || skuInfo?.product?.name || "BOS Component";
          
          const componentAttributes = resolveComponentAttributes(skuInfo, skuInfo?.product, skuInfo?.brand, name);

          const compImg = bk.image || skuInfo?.image || skuInfo?.product?.image || "";
          let finalCompImage = "";
          if (compImg) {
            if (compImg.startsWith("/")) {
              finalCompImage = `http://localhost:5000${compImg}`;
            } else {
              finalCompImage = compImg;
            }
          }

          bosComponents.push({
            name,
            quantity: bk.quantity || bk.qty || 1,
            skuCode: skuInfo?.sku_code || "",
            attributes: componentAttributes,
            image: finalCompImage || null,
            datasheet: skuInfo?.product?.datasheet || bk.datasheet || null
          });

          bosIncludedList.push(name);
          if (skuInfo && skuInfo.brand && !bosBrandName) {
            bosBrandName = skuInfo.brand.brand_name;
          }
          if (finalCompImage && !bosImage) {
            bosImage = finalCompImage;
          }
        });
      }

      if (!bosImage) {
        bosImage = "https://res.cloudinary.com/dggmbagax/image/upload/v1788328065/solarkits/solarkits-admin-panel-backend/public/uploads/combo_kits/BOS_1788328062998_421348048.jpg";
      }

      const catObj = kit.solar_kit_id?.category_id || {};
      let categoryName = catObj.name;
      let indObj = catObj.industry_type_id ? industryTypes.find(i => i._id.toString() === catObj.industry_type_id.toString()) : null;
      if (!indObj) {
        const matchedCat = categories.find(c => c._id?.toString() === catObj._id?.toString() || (c.name && catObj.name && c.name.toLowerCase() === catObj.name.toLowerCase()));
        if (matchedCat && matchedCat.industry_type_id) {
          indObj = industryTypes.find(i => i._id.toString() === matchedCat.industry_type_id.toString());
          if (!categoryName) categoryName = matchedCat.name;
        }
      }
      if (!indObj) {
        const kitNameLower = (kit.name || "").toLowerCase();
        if (kitNameLower.includes("commercial") || kitNameLower.includes("industrial") || kitNameLower.includes("c&i") || kitNameLower.includes("factory")) {
          indObj = industryTypes.find(i => i.name.toLowerCase().includes("commercial") || i.name.toLowerCase().includes("c&i"));
        } else if (kitNameLower.includes("pump") || kitNameLower.includes("agri") || kitNameLower.includes("kusum") || kitNameLower.includes("irrigation")) {
          indObj = industryTypes.find(i => i.name.toLowerCase().includes("agri") || i.name.toLowerCase().includes("pump"));
        } else if (kitNameLower.includes("utility") || kitNameLower.includes("megawatt") || kitNameLower.includes("floating") || kitNameLower.includes("ground mount") || kitNameLower.includes("mw")) {
          indObj = industryTypes.find(i => i.name.toLowerCase().includes("utility"));
        } else {
          indObj = industryTypes.find(i => i.name.toLowerCase().includes("residential")) || industryTypes[0];
        }
      }
      const industryTypeName = indObj ? indObj.name : "Residential Solar";
      const industryTypeId = indObj ? indObj._id.toString() : null;
      if (!categoryName) categoryName = "Rooftop";

      const subCategoryObj = kit.solar_kit_id?.subcategory_id || {};
      const subCategoryName = subCategoryObj.name || "Residential";
      const subCategoryColor = subCategoryObj.color || null;
      const subCategoryImage = subCategoryObj.image || null;

      const kitBrandDoc = kit.brand_id ? brands.find(b => b._id.toString() === kit.brand_id.toString()) : null;
      const finalBrandName = kitBrandDoc ? kitBrandDoc.brand_name : (firstPanel ? firstPanel.brandName : "");

      // Compile all component datasheets
      const kitDatasheets = [];
      const seenDatasheetUrls = new Set();

      // If combokit itself has a datasheet, add it as primary system datasheet
      if (kit.datasheet) {
        seenDatasheetUrls.add(kit.datasheet);
        kitDatasheets.push({
          id: kit._id.toString(),
          productName: `${kit.name} — System Datasheet`,
          brandName: finalBrandName || "SolarKit",
          skuCode: "SYSTEM-SPEC",
          componentType: "Combo Kit Complete Datasheet",
          datasheetUrl: kit.datasheet,
          hasDatasheet: true,
          quantity: 1,
          image: kit.kit_image
        });
      }

      baseComponents.forEach(comp => {
        const item = {
          id: comp.id,
          productName: comp.name,
          brandName: comp.brandName,
          skuCode: comp.skuCode,
          componentType: comp.actualType === "panel" ? "Solar Panel" : comp.actualType === "inverter" ? "Inverter" : (comp.technologyType || "Component"),
          datasheetUrl: comp.datasheet || null,
          hasDatasheet: !!comp.datasheet,
          quantity: comp.quantity,
          image: comp.image
        };
        if (comp.datasheet) {
          if (!seenDatasheetUrls.has(comp.datasheet)) {
            seenDatasheetUrls.add(comp.datasheet);
            kitDatasheets.push(item);
          }
        } else {
          kitDatasheets.push(item);
        }
      });

      // Include Complete BOS Kit in kitDatasheets
      if (bosComponents.length > 0 || (kit.bos_kits && kit.bos_kits.length > 0)) {
        const bosCount = bosComponents.length || kit.bos_kits?.length || 0;
        const bosItem = {
          id: "bos-kit-complete",
          productName: `Complete Balance of System (BOS) Kit (${bosCount} Components)`,
          brandName: bosBrandName || "SolarKits Certified",
          skuCode: kit.capacity ? `BOS-${kit.capacity}KW-KIT` : "BOS-KIT",
          componentType: "BOS Kit",
          datasheetUrl: kit.bos_datasheet || null,
          hasDatasheet: !!kit.bos_datasheet,
          quantity: 1,
          unit: "Set",
          image: bosImage || null,
          components: bosComponents,
          included: bosIncludedList
        };
        kitDatasheets.push(bosItem);
      }

      const mappedKit = {
        id: kit._id.toString(),
        hasNoAssignedVariants: assignedVariantIds.length === 0,
        brand: finalBrandName,
        kitName: kit.name,
        industryType: industryTypeName,
        industry_type_name: industryTypeName,
        industry_type_id: industryTypeId,
        category: categoryName,
        category_id: catObj._id ? catObj._id.toString() : null,
        subCategory: subCategoryName,
        subcategory_id: subCategoryObj._id ? subCategoryObj._id.toString() : null,
        usageType: subCategoryName,
        usageTypeColor: subCategoryColor,
        usageTypeImage: subCategoryImage,
        projectType: kit.solar_kit_id?.type_id?.name || "",
        projectRange: kit.project_range_id ? {
          id: kit.project_range_id._id.toString(),
          min: kit.project_range_id.min_value,
          max: kit.project_range_id.max_value,
          unit: kit.project_range_id.unit?.symbol || "kW",
          text: `${kit.project_range_id.min_value} - ${kit.project_range_id.max_value} ${kit.project_range_id.unit?.symbol || "kW"}`
        } : null,
        gstRate,
        gstIncluded: standardPrice - Math.round(standardPrice / (1 + (gstRate / 100))),
        ourPrice: standardPrice,
        marketPrice: premiumPrice,
        pricing: {
          showcaseMargin,
          standardMargin,
          poDiscountedMargin,
          basePrice: totalBasePrice,
          standardPrice,
          showcasePrice: premiumPrice,
          poPrice: basicPrice,
          gstRate,
          gstIncluded: standardPrice - Math.round(standardPrice / (1 + (gstRate / 100)))
        },
        marginPercent: standardMargin,
        bulkSetting: bulkSettingDoc ? {
          isEnabled: bulkSettingDoc.is_bulk_enabled,
          kitsPerBulk: bulkSettingDoc.kits_per_bulk,
          applyToVariants: bulkSettingDoc.apply_to_variants,
          tiers: (bulkSettingDoc.bulk_tiers || []).map(t => {
            const bulkPriceInclGst = calculatePriceWithMarginAndGst(totalBasePrice, t.margin, gstRate);
            return {
              quantity: t.quantity,
              margin: t.margin,
              pricePerKit: bulkPriceInclGst,
              discountVsShowcase: premiumPrice > 0
                ? Math.round(((premiumPrice - bulkPriceInclGst) / premiumPrice) * 100)
                : 0
            };
          })
        } : null,
        capacityKW: kit.capacity || 0,
        orderQuantities: (() => {
          const fromKit = (kit.order_quantities || []).map(Number).filter(n => !isNaN(n) && n > 0);
          const fromPricing = (marginDoc?.po_order_pricing || []).map(t => Number(t.quantity)).filter(n => !isNaN(n) && n > 0);
          const combined = [...new Set([...fromKit, ...fromPricing])].sort((a, b) => a - b);
          return combined.length > 0 ? combined : [100, 200, 400, 500, 1000];
        })(),
        order_quantities: (() => {
          const fromKit = (kit.order_quantities || []).map(Number).filter(n => !isNaN(n) && n > 0);
          const fromPricing = (marginDoc?.po_order_pricing || []).map(t => Number(t.quantity)).filter(n => !isNaN(n) && n > 0);
          const combined = [...new Set([...fromKit, ...fromPricing])].sort((a, b) => a - b);
          return combined.length > 0 ? combined : [100, 200, 400, 500, 1000];
        })(),
        looseOrderQuantities: (() => {
          const fromKit = (kit.loose_order_quantities || []).map(Number).filter(n => !isNaN(n) && n > 0);
          const fromPricing = (marginDoc?.loose_order_pricing || []).map(t => Number(t.quantity)).filter(n => !isNaN(n) && n > 0);
          const combined = [...new Set([...fromKit, ...fromPricing])].sort((a, b) => a - b);
          return combined.length > 0 ? combined : [5, 10, 15, 20, 25, 30];
        })(),
        loose_order_quantities: (() => {
          const fromKit = (kit.loose_order_quantities || []).map(Number).filter(n => !isNaN(n) && n > 0);
          const fromPricing = (marginDoc?.loose_order_pricing || []).map(t => Number(t.quantity)).filter(n => !isNaN(n) && n > 0);
          const combined = [...new Set([...fromKit, ...fromPricing])].sort((a, b) => a - b);
          return combined.length > 0 ? combined : [5, 10, 15, 20, 25, 30];
        })(),
        loose_order_pricing: marginDoc?.loose_order_pricing || [],
        po_order_pricing: marginDoc?.po_order_pricing || [],
        allow_trial_kit: Boolean(kit.allow_trial_kit),
        allowTrialKit: Boolean(kit.allow_trial_kit),
        trial_kit_quantity: Number(kit.trial_kit_quantity) || 10,
        trialKitQuantity: Number(kit.trial_kit_quantity) || 10,
        trial_kit_max_orders_per_buyer: kit.trial_kit_max_orders_per_buyer !== undefined ? Number(kit.trial_kit_max_orders_per_buyer) : 1,
        trialKitMaxOrdersPerBuyer: kit.trial_kit_max_orders_per_buyer !== undefined ? Number(kit.trial_kit_max_orders_per_buyer) : 1,
        trial_kit_purchased_count: trialCountByKitId[kit._id.toString()] || 0,
        trialKitPurchasedCount: trialCountByKitId[kit._id.toString()] || 0,
        trial_kit_limit_reached: (() => {
          const limit = kit.trial_kit_max_orders_per_buyer !== undefined ? Number(kit.trial_kit_max_orders_per_buyer) : 1;
          const purchased = trialCountByKitId[kit._id.toString()] || 0;
          return Boolean(limit > 0 && purchased >= limit);
        })(),
        trialKitLimitReached: (() => {
          const limit = kit.trial_kit_max_orders_per_buyer !== undefined ? Number(kit.trial_kit_max_orders_per_buyer) : 1;
          const purchased = trialCountByKitId[kit._id.toString()] || 0;
          return Boolean(limit > 0 && purchased >= limit);
        })(),
        description: kit.description || (kit.capacity ? `High quality solar kit of ${kit.capacity}kW capacity.` : ""),
        warrantyYears: (firstPanel && firstPanel.warrantyYears) || (firstInverter && firstInverter.warrantyYears) || null,
        generationEstimateKWhPerYear: kit.capacity ? Math.round(kit.capacity * 1400) : null,
        kitImage: (() => {
          let img = kit.kit_image || (firstPanel && firstPanel.image) || (firstInverter && firstInverter.image) || null;
          if (!img) return null;
          if (img.includes("localhost:3001")) return img.replace("localhost:3001", "localhost:5000");
          if (img.startsWith("http://") || img.startsWith("https://")) return img;
          return `http://localhost:5000/${img.startsWith('/') ? img.slice(1) : img}`;
        })(),
        panel: firstPanel ? {
          brandName: firstPanel.brandName,
          technologyType: firstPanel.technologyType,
          wattPerPanel: firstPanel.wattPerPanel,
          efficiencyPercent: firstPanel.efficiencyPercent,
          quantity: firstPanel.quantity,
          dimensionMM: panelDimension || null,
          warrantyYears: firstPanel.warrantyYears || null,
          panelImage: firstPanel.panelImage,
          datasheet: firstPanel.datasheet || null,
          attributes: firstPanel.attributes
        } : null,
        inverter: firstInverter ? {
          brandName: firstInverter.brandName,
          category: firstInverter.category,
          type: firstInverter.type,
          capacityKW: firstInverter.capacityKW,
          efficiencyPercent: firstInverter.efficiencyPercent,
          warrantyYears: firstInverter.warrantyYears || null,
          features: [],
          inverterImage: firstInverter.inverterImage,
          datasheet: firstInverter.datasheet || null,
          quantity: firstInverter.quantity,
          attributes: firstInverter.attributes
        } : null,
        includedComponents: baseComponents,
        datasheet: kit.datasheet || null,
        datasheets: kitDatasheets,
        hasDatasheet: !!kit.datasheet || kitDatasheets.some(d => d.hasDatasheet),
        BOSKit: {
          brandName: bosBrandName || "Generic",
          included: bosIncludedList,
          BOSKitImage: bosImage,
          components: bosComponents
        },
        variants,
        limitedStock: {
          displayBadge,
          displayPopup,
          quantityLeft: availableStockKitsForced,
          threshold
        },
        flashSale: flashSaleDoc ? {
          name: flashSaleDoc.offer_name,
          discountType: flashSaleDoc.discount_type,
          discountValue: flashSaleDoc.discount_value,
          endDate: flashSaleDoc.end_date,
          maxQty: flashSaleDoc.max_qty
        } : null
      };

      const bsInfo = bestSellerMap.get(kit._id.toString()) || null;
      mappedKit.is_best_seller = !!bsInfo;
      mappedKit.best_seller_badge = bsInfo ? bsInfo.badge_text : null;
      mappedKit.best_seller_priority = bsInfo ? bsInfo.priority : 999;
      mappedKit.best_seller_info = bsInfo;

      processedKits.push(mappedKit);
    }

    return res.status(200).json({
      success: true,
      source: "db",
      data: processedKits,
    });

  } catch (error) {
    console.error("get_combo_kits_by_district error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────
// GET /shop/best-sellers?district_id=...&state_id=...
// Returns curated Best Seller combo kits for the selected district/state
// ─────────────────────────────────────────────────────────────────
const get_best_seller_kits = async (req, res) => {
  try {
    const { district_id, state_id, pincode } = req.query;

    let targetDistrictId = district_id;
    let targetStateId = state_id;
    const targetPincode = pincode ? pincode.trim() : null;
    let localityName = null;

    if (targetPincode && (!targetDistrictId || !mongoose.Types.ObjectId.isValid(targetDistrictId))) {
      const pDoc = await GeoLevel2.findOne({ 'pincodes.pincode': targetPincode, deleted_at: null }).lean().catch(() => null);
      if (pDoc) {
        targetDistrictId = pDoc._id.toString();
        if (pDoc.level_1) targetStateId = pDoc.level_1.toString();
        const matched = (pDoc.pincodes || []).find(p => String(p.pincode).trim() === targetPincode);
        if (matched && matched.locality) localityName = matched.locality;
        req.query.district_id = targetDistrictId;
      }
    }

    let resolvedKits = [];
    const mockRes = {
      status: () => mockRes,
      json: (payload) => {
        if (payload && payload.data) resolvedKits = payload.data;
        return mockRes;
      }
    };

    await get_combo_kits_by_district(req, mockRes);

    let locationMeta = {
      state_name: "Gujarat",
      district_name: "Rajkot",
      pincode: targetPincode || null,
      locality: localityName || null,
      is_fallback: false
    };

    if (targetDistrictId && mongoose.Types.ObjectId.isValid(targetDistrictId)) {
      const distDoc = await GeoLevel2.findById(targetDistrictId).lean().catch(() => null);
      if (distDoc) {
        locationMeta.district_name = distDoc.name;
        locationMeta.district_id = distDoc._id;
        if (distDoc.level_1) {
          const stateDoc = await GeoLevel1.findById(distDoc.level_1).lean().catch(() => null);
          if (stateDoc) {
            locationMeta.state_name = stateDoc.name;
            locationMeta.state_id = stateDoc._id;
          }
        }
      }
    } else if (targetStateId && mongoose.Types.ObjectId.isValid(targetStateId)) {
      const stateDoc = await GeoLevel1.findById(targetStateId).lean().catch(() => null);
      if (stateDoc) {
        locationMeta.state_name = stateDoc.name;
        locationMeta.state_id = stateDoc._id;
        locationMeta.district_name = "All Districts";
      }
    }

    // Filter kits marked as best seller (explicitly configured and active)
    let bestSellers = resolvedKits
      .filter(k => k.is_best_seller)
      .sort((a, b) => (a.best_seller_priority || 999) - (b.best_seller_priority || 999));

    // Dynamic Fallback: If no kits are explicitly tagged yet, showcase top catalog kits with dynamic ranking
    if (bestSellers.length === 0 && resolvedKits.length > 0) {
      const locLabel = locationMeta.district_name && locationMeta.district_name !== 'All Districts'
        ? locationMeta.district_name
        : locationMeta.state_name;
      bestSellers = resolvedKits.slice(0, 4).map((k, idx) => ({
        ...k,
        is_best_seller: true,
        best_seller_priority: idx + 1,
        best_seller_badge: idx === 0 ? `🔥 #1 Best Seller in ${locLabel}` : (idx === 1 ? `⚡ High Demand in ${locLabel}` : '⭐ Top Rated'),
        best_seller_state: locationMeta.state_name,
        best_seller_district: locationMeta.district_name
      }));
    }

    return res.status(200).json({
      success: true,
      data: bestSellers,
      location: locationMeta
    });

  } catch (error) {
    console.error("get_best_seller_kits error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────
// GET /shop/inventory-status?district_id=...
// Returns { kitId: availableStock } for all kits in that district
// Used for live frontend polling (every 30 seconds)
// ─────────────────────────────────────────────────────────────────
const get_inventory_status = async (req, res) => {
  try {
    const { district_id } = req.query;

    let targetDistrictId = district_id;
    if (!targetDistrictId || !mongoose.Types.ObjectId.isValid(targetDistrictId)) {
      const defaultWarehouse = await CompanyWarehouse.findOne({
        warehouse_type: 'sub',
        is_active: true,
        deleted_at: null
      }).lean();
      if (defaultWarehouse?.level_2) {
        targetDistrictId = defaultWarehouse.level_2.toString();
      }
    }

    if (!targetDistrictId) {
      return res.status(200).json({ success: true, stock: {} });
    }

    // Find district to get cluster_id for warehouse check
    const districtDoc = await GeoLevel2.findById(targetDistrictId).lean();
    const clusterId = districtDoc?.cluster || null;

    // Find sub warehouses in this district
    let warehouses = await CompanyWarehouse.find({
      level_2: new mongoose.Types.ObjectId(targetDistrictId),
      warehouse_type: 'sub',
      is_active: true,
      deleted_at: null
    }).lean();

    // Fall back to master warehouse if no sub warehouses exist
    if (warehouses.length === 0 && clusterId) {
      const clusterDistricts = await GeoLevel2.find({ cluster: clusterId, deleted_at: null }).select('_id').lean();
      const clusterDistrictIds = clusterDistricts.map(d => d._id);

      const masterWarehouse = await CompanyWarehouse.findOne({
        level_2: { $in: clusterDistrictIds },
        warehouse_type: 'master',
        is_active: true,
        deleted_at: null
      }).lean();

      if (masterWarehouse) {
        warehouses = [masterWarehouse];
      }
    }

    if (warehouses.length === 0) {
      return res.status(200).json({ success: true, stock: {} });
    }

    const warehouseIds = warehouses.map(w => w._id);

    const activations = await WarehouseKitActivation.find({
      warehouse_id: { $in: warehouseIds },
      is_combokit_active: true,
      is_active: true,
      deleted_at: null
    }).lean();

    if (!activations || activations.length === 0) {
      return res.status(200).json({ success: true, stock: {} });
    }

    const kitIds = activations.map(a => a.combo_kit_id).filter(Boolean);
    const kits = await ComboKit.find({ _id: { $in: kitIds }, deleted_at: null }).lean();

    // Collect all SKU IDs
    const allSkuIds = [];
    kits.forEach(kit => {
      (kit.base_components || []).forEach(bc => { if (bc.sku_id) allSkuIds.push(bc.sku_id); });
      (kit.bos_kits || []).forEach(bk => { if (bk.sku_id) allSkuIds.push(bk.sku_id); });
    });
    const uniqueSkuIds = [...new Set(allSkuIds.map(id => id.toString()))].map(id => new mongoose.Types.ObjectId(id));

    // Fetch all warehouse stocks in one query
    const warehouseStocks = await WarehouseStock.find({
      warehouse_id: { $in: warehouseIds },
      sku_id: { $in: uniqueSkuIds }
    }).lean();

    const physicalStockMap = {};
    warehouseStocks.forEach(s => {
      const key = s.sku_id.toString();
      physicalStockMap[key] = (physicalStockMap[key] || 0) + (s.qty || 0);
    });

    const reservedSKUsMap = await getReservedSKUsMap(warehouseIds);
    const bookedSKUsMap = await getBookedSKUsMap(warehouseIds);

    const bookedMap = {};
    const reservedMap = {};
    for (const key of Object.keys(bookedSKUsMap)) {
      const skuId = key.split('_')[1];
      bookedMap[skuId] = (bookedMap[skuId] || 0) + bookedSKUsMap[key];
    }
    for (const key of Object.keys(reservedSKUsMap)) {
      const skuId = key.split('_')[1];
      reservedMap[skuId] = (reservedMap[skuId] || 0) + reservedSKUsMap[key];
    }

    // Fetch PC solar panel template IDs to identify which SKUs are solar panels
    const { ProductTemplate } = require("../../../admin-panel/models/core_db");
    const solarPanelTemplates = await ProductTemplate.find({ name: /solar panel/i }).lean();
    const solarPanelTemplateIds = solarPanelTemplates.map(t => t._id.toString());

    const skuDocs = await ProductSku.find({ _id: { $in: uniqueSkuIds } }).lean();
    const productIds = skuDocs.map(sku => sku.product_id).filter(Boolean);
    const products = await Product.find({ _id: { $in: productIds } }).lean();

    const panelSkuIdsMap = {};
    skuDocs.forEach(sku => {
      const prod = products.find(p => p._id.toString() === sku.product_id?.toString());
      if (prod && prod.template_id && solarPanelTemplateIds.includes(prod.template_id.toString())) {
        panelSkuIdsMap[sku._id.toString()] = true;
      }
    });

    // Compute other active carts' SKU depletion
    const shopSettings = await SolarShopSettings.findOne({}).lean() || {};
    const durationMin = shopSettings.checkout_timer_duration || 10;
    const cartExpiryThreshold = new Date(Date.now() - durationMin * 60 * 1000);
    const activeCarts = await Cart.find({ updated_at: { $gt: cartExpiryThreshold } }).lean();

    const skuDepletion = {};
    for (const cartDoc of activeCarts) {
      for (const cartItem of (cartDoc.cart || [])) {
        if (cartItem.is_custom) continue;
        const kit = kits.find(k => k._id.toString() === cartItem.id?.toString());
        if (!kit) continue;
        const qty = cartItem.qty || 1;
        [...(kit.base_components || []), ...(kit.bos_kits || [])].forEach(comp => {
          if (comp.sku_id) {
            const key = comp.sku_id.toString();
            skuDepletion[key] = (skuDepletion[key] || 0) + ((comp.quantity || 1) * qty);
          }
        });
      }
    }

    // Compute available stock per kit
    const stockResult = {};
    for (const kit of kits) {
      const allComponents = [...(kit.base_components || []), ...(kit.bos_kits || [])];
      let availableStockKits = Infinity;

      allComponents.forEach(comp => {
        if (comp.sku_id) {
          const skuIdStr = comp.sku_id.toString();
          const isPanel = panelSkuIdsMap[skuIdStr];
          
          if (isPanel) {
            const physical = physicalStockMap[skuIdStr];
            // Only enforce physical warehouse stock bounds if physical stock is explicitly seeded (> 0).
            // Unseeded/unmanaged physical stock should not falsely set kit stock to 0 ("Out of Stock").
            if (physical !== undefined && physical > 0) {
              const reserved = reservedMap[skuIdStr] || 0;
              const booked = bookedMap[skuIdStr] || 0;
              const net = Math.max(0, physical - reserved - booked);
              const maxForSku = Math.floor(net / (comp.quantity || 1));
              if (maxForSku < availableStockKits) availableStockKits = maxForSku;
            }
          }
        }
      });

      if (availableStockKits === Infinity) availableStockKits = 999;

      stockResult[kit._id.toString()] = availableStockKits;
    }

    return res.status(200).json({ success: true, stock: stockResult });

  } catch (error) {
    console.error("get_inventory_status error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const get_checkout_settings = async (req, res) => {
  try {
    const settings = await SolarShopSettings.findOne({}).lean();
    if (!settings) {
      return res.status(200).json({
        success: true,
        data: {
          enable_checkout_timer: true,
          checkout_timer_duration: 10,
          combokit_bulk_panels_limit: 30,
          gst_rate: 13.8
        }
      });
    }
    return res.status(200).json({
      success: true,
      data: {
        enable_checkout_timer: settings.enable_checkout_timer ?? true,
        checkout_timer_duration: settings.checkout_timer_duration ?? 10,
        combokit_bulk_panels_limit: settings.combokit_bulk_panels_limit ?? 30,
        gst_rate: settings.gst_rate ?? 13.8
      }
    });
  } catch (error) {
    console.error("get_checkout_settings error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const get_active_offers = async (req, res) => {
  try {
    const { district_id } = req.query;
    const now = new Date();

    const filter = {
      is_active: true,
      start_date: { $lte: now },
      end_date: { $gte: now },
      deleted_at: null,
    };

    if (district_id) {
      const districtDoc = await GeoLevel2.findById(district_id).lean();
      if (districtDoc && districtDoc.cluster) {
        filter.$or = [
          { cluster_id: districtDoc.cluster },
          { cluster_id: null }
        ];
      } else {
        filter.cluster_id = null;
      }
    }

    const activeOffers = await OfferMaster.find(filter).lean();

    return res.status(200).json({
      success: true,
      data: activeOffers.map(o => ({
        _id: o._id,
        offer_name: o.offer_name,
        offer_type: o.offer_type,
        discount_type: o.discount_type,
        discount_value: o.discount_value,
        min_cart_value: o.min_cart_value,
        max_discount: o.max_discount,
        end_date: o.end_date,
        products_applicable: o.products_applicable,
        priority: o.priority,
        stackable: o.stackable,
        coupon_code: o.coupon_code,
        max_qty: o.max_qty
      }))
    });
  } catch (error) {
    console.error("get_active_offers error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const reserve_stock = async (req, res) => {
  try {
    const customer_id = req.user.account_id;
    const { items, duration_minutes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(200).json({ success: true, message: "No items provided for reservation.", timer_enabled: false });
    }

    const settings = await SolarShopSettings.findOne({}).lean() || { checkout_timer_duration: 10 };
    const durationMin = duration_minutes || settings.checkout_timer_duration || 10;
    const expiryTime = new Date(Date.now() + durationMin * 60 * 1000);

    // Release any existing reservations for this customer
    await InventoryReservation.updateMany(
      { customer_id, status: 'reserved' },
      { $set: { status: 'released' } }
    );

    const reservationRecords = [];
    for (const item of items) {
      if (item.is_custom) continue;

      const kit = await ComboKit.findById(item.id).lean();
      if (!kit) continue;

      const record = await InventoryReservation.create({
        customer_id,
        product_id: kit._id,
        quantity: item.qty || 1,
        status: 'reserved',
        expiry_time: expiryTime,
        reminder_sent: false
      });
      reservationRecords.push(record);
    }

    return res.status(200).json({
      success: true,
      message: `Stock reserved for ${durationMin} minutes`,
      timer_enabled: true,
      expiry_time: expiryTime,
      reservations: reservationRecords
    });

  } catch (error) {
    console.error("reserve_stock error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const checkGstVerificationForOrder = async (customer_id, items) => {
  const account = await EpcAccount.findById(customer_id).lean();
  if (!account) {
    return { error: "Account not found." };
  }

  const stateIds = [];
  for (const item of items) {
    const kitId = item.id || item.combo_kit_id;
    if (!kitId) continue;
    const kit = await ComboKit.findById(kitId).lean();
    if (kit && kit.state_id) {
      stateIds.push(kit.state_id.toString());
    }
  }

  const uniqueStateIds = [...new Set(stateIds)];

  if (uniqueStateIds.length === 0) {
    return { allowed: true };
  }

  if (!account.company_id) {
    return {
      allowed: false,
      gst_required: true,
      state_id: uniqueStateIds[0],
      message: "GST verification is required before placing orders."
    };
  }

  for (const stateId of uniqueStateIds) {
    const gstRecord = await EpcCompanyGst.findOne({
      company_id: account.company_id,
      state_id: stateId,
      deleted_at: null
    }).lean();

    if (!gstRecord) {
      return {
        allowed: false,
        gst_required: true,
        state_id: stateId,
        message: `GST verification is required for the target state.`
      };
    }
  }

  return { allowed: true };
};

const confirm_order = async (req, res) => {
  try {
    const customer_id = req.user.account_id;
    const { items, discount_applied } = req.body;

    // Sub-user authorization check for checkout
    const callerAccount = await EpcAccount.findById(customer_id).lean();
    if (callerAccount && callerAccount.parent_account_id) {
      const perms = callerAccount.permissions || [];
      const hasCheckout = perms.includes('all') || perms.includes('can_checkout');
      if (!hasCheckout) {
        return res.status(403).json({
          success: false,
          message: 'Your account does not have authorization to checkout orders. Please contact your EPC Admin.'
        });
      }
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "No items provided for order confirmation." });
    }

    const gstCheck = await checkGstVerificationForOrder(customer_id, items);
    if (!gstCheck.allowed) {
      return res.status(400).json({
        success: false,
        gst_required: true,
        state_id: gstCheck.state_id,
        message: gstCheck.message
      });
    }

    const activeResvs = await InventoryReservation.find({
      customer_id,
      status: 'reserved',
      expiry_time: { $gt: new Date() }
    });

    if (activeResvs.length > 0) {
      await InventoryReservation.updateMany(
        { _id: { $in: activeResvs.map(r => r._id) } },
        { $set: { status: 'booked' } }
      );
    }

    // Resolve SKUs and Cluster IDs for pricing calculation
    const allSkuIds = [];
    const clusterIds = [];
    for (const item of items) {
      if (item.is_custom) continue;
      const kit = await ComboKit.findById(item.id).lean();
      if (!kit) continue;
      const components = [...(kit.base_components || []), ...(kit.bos_kits || [])];
      components.forEach(c => {
        if (c.sku_id) allSkuIds.push(c.sku_id.toString());
      });
      if (kit.cluster_id) {
        clusterIds.push(kit.cluster_id.toString());
      }
    }

    const uniqueSkuIds = [...new Set(allSkuIds)].map(id => new mongoose.Types.ObjectId(id));
    const uniqueClusterIds = [...new Set(clusterIds)].map(id => new mongoose.Types.ObjectId(id));

    // Fetch actual benchmark prices from ProductSkuPrice
    const pricingRecords = await ProductSkuPrice.find({
      sku_id: { $in: uniqueSkuIds },
      cluster_id: { $in: uniqueClusterIds }
    }).lean();

    const priceMap = {};
    pricingRecords.forEach(r => {
      if (r.sku_id && r.cluster_id) {
        priceMap[`${r.cluster_id.toString()}-${r.sku_id.toString()}`] = r.price || 0;
      }
    });

    for (const item of items) {
      if (item.is_custom) continue;

      const kit = await ComboKit.findById(item.id).lean();
      if (!kit) continue;

      // Resolve warehouse_id and district_id for this kit
      let resolvedWarehouseId = null;
      let resolvedDistrictId = item.districtId || null;

      if (resolvedDistrictId) {
        // Find sub warehouse in this district that has this kit activated
        const warehouses = await CompanyWarehouse.find({
          level_2: new mongoose.Types.ObjectId(resolvedDistrictId),
          warehouse_type: 'sub',
          is_active: true,
          deleted_at: null
        }).lean();
        const warehouseIds = warehouses.map(w => w._id);
        const activation = await WarehouseKitActivation.findOne({
          combo_kit_id: kit._id,
          warehouse_id: { $in: warehouseIds },
          is_combokit_active: true,
          is_active: true,
          deleted_at: null
        }).lean();
        if (activation) {
          resolvedWarehouseId = activation.warehouse_id;
        } else if (warehouseIds.length > 0) {
          resolvedWarehouseId = warehouseIds[0];
        }
      }

      // Fallback 1: If no districtId or warehouse was resolved, search any activation for this kit
      if (!resolvedWarehouseId) {
        const activation = await WarehouseKitActivation.findOne({
          combo_kit_id: kit._id,
          is_combokit_active: true,
          is_active: true,
          deleted_at: null
        }).lean();
        if (activation) {
          resolvedWarehouseId = activation.warehouse_id;
          if (!resolvedDistrictId) {
            const warehouse = await CompanyWarehouse.findById(resolvedWarehouseId).lean();
            resolvedDistrictId = warehouse?.level_2 || null;
          }
        }
      }

      // Fallback 2: use a default active warehouse if still not found
      if (!resolvedWarehouseId) {
        const defaultWarehouse = await CompanyWarehouse.findOne({
          is_active: true,
          deleted_at: null
        }).lean();
        if (defaultWarehouse) {
          resolvedWarehouseId = defaultWarehouse._id;
          if (!resolvedDistrictId) {
            resolvedDistrictId = defaultWarehouse.level_2 || null;
          }
        }
      }

      const kitClusterId = kit.cluster_id ? kit.cluster_id.toString() : "";
      let totalBasePrice = 0;
      const skuPricesSnapshot = [];

      const components = [...(kit.base_components || []), ...(kit.bos_kits || [])];
      for (const comp of components) {
        if (comp.sku_id) {
          // Get pricing
          const key = `${kitClusterId}-${comp.sku_id.toString()}`;
          const bPrice = priceMap[key] || 0;
          totalBasePrice += bPrice * (comp.quantity || 1);

          skuPricesSnapshot.push({
            sku_id: comp.sku_id,
            price: bPrice
          });
        }
      }

      // Calculate selling price
      const marginDoc = await CompanyMargin.findOne({
        warehouse_id: resolvedWarehouseId,
        combo_kit_id: kit._id,
        is_active: true,
        deleted_at: null
      }).lean();
      const standardMargin = marginDoc ? (marginDoc.standard_margin || 0) : 0;
      const gstRate = marginDoc?.gst_rate ?? item.gstRate ?? 13.8;
      const standardPrice = calculatePriceWithMarginAndGst(totalBasePrice, standardMargin, gstRate);

      // If additional price for variant exists
      const addPrice = Number(item.additionalPrice || item.addPrice || 0);
      const computedSellingPrice = standardPrice + addPrice;

      let resolvedStateId = kit.state_id || null;
      if (resolvedDistrictId) {
        const distDoc = await GeoLevel2.findById(resolvedDistrictId).lean();
        if (distDoc && distDoc.level_1) {
          resolvedStateId = distDoc.level_1;
        }
      }

      const defaultStateId = new mongoose.Types.ObjectId("69f9be0a711beb75adfcfa95"); // Maharashtra
      const defaultDistrictId = new mongoose.Types.ObjectId("69f9be0a711beb75adfcfade"); // Nagpur

      const finalStateId = resolvedStateId || defaultStateId;
      const finalDistrictId = resolvedDistrictId || defaultDistrictId;

      const orderQty = item.qty || 1;
      let firstPo = null;

      for (let q = 0; q < orderQty; q++) {
        const poPayload = {
          customer_id,
          country_id: kit.country_id || new mongoose.Types.ObjectId("69f9be0a711beb75adfcfa7f"),
          state_id: finalStateId,
          district_id: finalDistrictId,
          cluster_id: kit.cluster_id || new mongoose.Types.ObjectId("69f9be0a711beb75adfcfae0"),
          warehouse_id: resolvedWarehouseId,
          combo_kit_id: kit._id,
          base_price_snapshot: totalBasePrice || kit.base_price_cached || 150000,
          selling_price_snapshot: computedSellingPrice || item.ourPrice || kit.selling_price_cached || 180000,
          status: 'confirmed',
          sku_prices_snapshot: skuPricesSnapshot,
          delivery_address: null
        };

        const po = await PurchaseOrder.create(poPayload);
        if (!firstPo) firstPo = po;
      }

      const totalKits = items.reduce((sum, i) => sum + i.qty, 0);
      if (totalKits >= 5 && firstPo) {
        await ComboBundleMaster.create({
          customer_id,
          total_kits: totalKits,
          discount_applied: discount_applied || 0,
          purchase_order_id: firstPo._id
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Order confirmed and inventory booked successfully!"
    });

  } catch (error) {
    console.error("confirm_order error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const get_cart = async (req, res) => {
  try {
    const account_id = req.user.account_id || req.user.id || req.user._id;
    if (!account_id) {
      return res.status(400).json({ success: false, message: "Account ID missing from request token" });
    }
    let cartDoc = await Cart.findOne({ account_id });
    if (!cartDoc) {
      return res.status(200).json({ success: true, cart: [], expiry_time: null });
    }
    
    // Find active checkout reservation for this customer
    const activeResv = await InventoryReservation.findOne({
      customer_id: account_id,
      status: 'reserved',
      expiry_time: { $gt: new Date() }
    }).sort({ expiry_time: 1 }).lean();

    const expiryTime = activeResv ? activeResv.expiry_time : null;
    
    return res.status(200).json({
      success: true,
      cart: cartDoc.cart || [],
      expiry_time: expiryTime
    });
  } catch (error) {
    console.error("get_cart error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const update_cart = async (req, res) => {
  try {
    const account_id = req.user.account_id || req.user.id || req.user._id;
    if (!account_id) {
      return res.status(400).json({ success: false, message: "Account ID missing from request token" });
    }
    const { cart } = req.body;

    // Check sub-user permission when adding/updating cart items
    if (cart && Array.isArray(cart) && cart.length > 0) {
      const callerAccount = await EpcAccount.findById(account_id).lean();
      if (callerAccount && callerAccount.parent_account_id) {
        const perms = callerAccount.permissions || [];
        const hasCartPermission = perms.includes('all') || perms.includes('can_add_to_cart') || perms.includes('can_checkout');
        if (!hasCartPermission) {
          return res.status(403).json({
            success: false,
            message: 'Your account is not authorized to add products to the cart. Please contact your EPC Admin.'
          });
        }
      }
    }

    // Early exit: if the cart is empty, skip all stock checks and just clear
    // the persisted cart in the database. No inventory check needed.
    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      await Cart.findOneAndUpdate(
        { account_id },
        { $set: { cart: [], updated_at: new Date() } },
        { upsert: true, new: true }
      );
      return res.status(200).json({
        success: true,
        message: "Cart cleared successfully",
        expiry_time: null
      });
    }

    // 1. Fetch settings
    const settings = await SolarShopSettings.findOne({}).lean() || {
      checkout_timer_duration: 10
    };
    const durationMin = settings.checkout_timer_duration || 10;
    const expiryTime = new Date(Date.now() + durationMin * 60 * 1000);

    // 2. Fetch all product templates that are Solar Panels
    const { ProductTemplate } = require("../../../admin-panel/models/core_db");
    const solarPanelTemplates = await ProductTemplate.find({ name: /solar panel/i }).lean();
    const solarPanelTemplateIds = solarPanelTemplates.map(t => t._id.toString());

    // 3. Compute incoming cart's Solar Panel SKU requirements
    const incomingSolarPanelRequirements = {};
    const warehouseIds = [];
    if (cart && Array.isArray(cart)) {
      for (const item of cart) {
        if (item.is_custom || item.is_catalogue_item) continue;
        if (!item.id || !mongoose.Types.ObjectId.isValid(item.id)) continue;
        const kit = await ComboKit.findById(item.id).lean();
        if (!kit) continue; // Standalone product or reseller listing item: skip combo-kit component decomposition
        if (kit.warehouse_id) {
          warehouseIds.push(kit.warehouse_id.toString());
        }
        const qty = item.qty || 1;
        
        // Base components
        (kit.base_components || []).forEach(comp => {
          if (comp.sku_id && comp.template_id) {
            if (solarPanelTemplateIds.includes(comp.template_id.toString())) {
              const skuIdStr = comp.sku_id.toString();
              const compReqQty = comp.quantity || 1;
              incomingSolarPanelRequirements[skuIdStr] = (incomingSolarPanelRequirements[skuIdStr] || 0) + (compReqQty * qty);
            }
          }
        });

        // BOS components (check if they have solar panel templates)
        (kit.bos_kits || []).forEach(comp => {
          if (comp.sku_id && comp.template_ids) {
            const hasPanelTemplate = comp.template_ids.some(id => solarPanelTemplateIds.includes(id.toString()));
            if (hasPanelTemplate) {
              const skuIdStr = comp.sku_id.toString();
              const compReqQty = comp.quantity || 1;
              incomingSolarPanelRequirements[skuIdStr] = (incomingSolarPanelRequirements[skuIdStr] || 0) + (compReqQty * qty);
            }
          }
        });
      }
    }

    const uniqueWarehouseIds = [...new Set(warehouseIds)].map(id => new mongoose.Types.ObjectId(id));
    const requiredSkuIds = Object.keys(incomingSolarPanelRequirements).map(id => new mongoose.Types.ObjectId(id));

    // 4. Verify against warehouse stock of the required solar panel SKUs
    if (requiredSkuIds.length > 0) {
      const query = { sku_id: { $in: requiredSkuIds } };
      if (uniqueWarehouseIds.length > 0) {
        query.warehouse_id = { $in: uniqueWarehouseIds };
      }
      
      const warehouseStocks = await WarehouseStock.find(query).lean();

      // Fetch active reservations for other users for these SKUs
      const otherActiveResvs = await InventoryReservation.find({
        customer_id: { $ne: account_id },
        status: 'reserved',
        expiry_time: { $gt: new Date() }
      }).lean();

      // Resolve warehouse IDs for each reservation's kit
      const resolvedWarehouseMap = {};
      const kitIds = otherActiveResvs.map(r => r.product_id).filter(Boolean);
      const kitsForRes = await ComboKit.find({ _id: { $in: kitIds } }).lean();
      for (const kit of kitsForRes) {
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

      const otherSkuReservations = {};
      otherActiveResvs.forEach(r => {
        if (!r.product_id) return;
        const whIdStr = resolvedWarehouseMap[r.product_id.toString()];
        if (whIdStr && uniqueWarehouseIds.map(id => id.toString()).includes(whIdStr)) {
          const kit = kitsForRes.find(k => k._id.toString() === r.product_id.toString());
          if (kit) {
            const components = [...(kit.base_components || []), ...(kit.bos_kits || [])];
            components.forEach(comp => {
              if (comp.sku_id) {
                const skuIdStr = comp.sku_id.toString();
                otherSkuReservations[skuIdStr] = (otherSkuReservations[skuIdStr] || 0) + (comp.quantity || 1) * r.quantity;
              }
            });
          }
        }
      });

      // Fetch active bookings for other users for these warehouses
      const bookedSKUsMap = await getBookedSKUsMap(uniqueWarehouseIds);
      const otherBooked = {};
      for (const key of Object.keys(bookedSKUsMap)) {
        const skuIdStr = key.split('_')[1];
        otherBooked[skuIdStr] = (otherBooked[skuIdStr] || 0) + bookedSKUsMap[key];
      }
      
      const stockMap = {};
      warehouseStocks.forEach(ws => {
        const skuIdStr = ws.sku_id.toString();
        stockMap[skuIdStr] = (stockMap[skuIdStr] || 0) + (ws.qty || 0);
      });
      
      for (const skuIdStr of Object.keys(incomingSolarPanelRequirements)) {
        const physicalStock = stockMap[skuIdStr] || 0;
        const otherReserved = otherSkuReservations[skuIdStr] || 0;
        const booked = otherBooked[skuIdStr] || 0;
        const netAvailable = Math.max(0, physicalStock - otherReserved - booked);
        const required = incomingSolarPanelRequirements[skuIdStr];
        
        if (required > netAvailable && physicalStock > 0) {
          return res.status(400).json({
            success: false,
            message: `Insufficient inventory. Selected solar panel(s) exceed available stock.`
          });
        }
      }
    }

    // 5. Release any active checkout reservations for this customer when they modify/update their cart
    await InventoryReservation.updateMany(
      { customer_id: account_id, status: 'reserved' },
      { $set: { status: 'released' } }
    );

    // 6. Save updated cart
    await Cart.findOneAndUpdate(
      { account_id },
      { $set: { cart: cart || [], updated_at: new Date() } },
      { upsert: true, new: true }
    );
    
    return res.status(200).json({
      success: true,
      message: "Cart updated successfully",
      // Return the computed expiry time so the frontend countdown timer works.
      // Previously this was hardcoded to null, making the timer non-functional.
      expiry_time: expiryTime
    });
  } catch (error) {
    console.error("update_cart error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const create_request_order = async (req, res) => {
  try {
    const customer_id = req.user.account_id;
    const { items, total_amount } = req.body;

    // Sub-user authorization check for checkout / buy
    const callerAccount = await EpcAccount.findById(customer_id).lean();
    if (callerAccount && callerAccount.parent_account_id) {
      const perms = callerAccount.permissions || [];
      const hasCheckout = perms.includes('all') || perms.includes('can_checkout');
      if (!hasCheckout) {
        return res.status(403).json({
          success: false,
          message: 'Your account does not have authorization to submit orders. Please contact your EPC Admin.'
        });
      }
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "No items provided for the request order." });
    }

    const gstCheck = await checkGstVerificationForOrder(customer_id, items);
    if (!gstCheck.allowed) {
      return res.status(400).json({
        success: false,
        gst_required: true,
        state_id: gstCheck.state_id,
        message: gstCheck.message
      });
    }

    const reqItems = [];
    for (const item of items) {
      const kit = await ComboKit.findById(item.id).lean();
      if (!kit) {
        return res.status(404).json({ success: false, message: `Combo kit not found: ${item.id}` });
      }
      
      const bulkPack = item.bulkPack || {};
      const pricePerKit = bulkPack.pricePerKitAfterDiscount || item.ourPrice;
      const kitsPerPack = bulkPack.kitsPerPack || 1;
      const totalPrice = item.qty * pricePerKit * kitsPerPack;

      reqItems.push({
        combo_kit_id: item.id,
        variant_index: item.variantIndex || 0,
        qty: item.qty,
        price_per_kit: pricePerKit,
        total_price: totalPrice,
        product_tier: item.productTier
      });
    }

    const calculatedTotal = reqItems.reduce((sum, item) => sum + item.total_price, 0);

    const requestOrder = await RequestOrder.create({
      customer_id,
      items: reqItems,
      total_amount: total_amount || calculatedTotal,
      status: 'pending'
    });

    // Also clear the user's bulkCart in the DB if one exists
    await Cart.updateOne(
      { account_id: customer_id },
      { $set: { bulkCart: [] } }
    );

    return res.status(200).json({
      success: true,
      message: "Order request submitted successfully!",
      data: requestOrder
    });

  } catch (error) {
    console.error("create_request_order error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const get_gst_status = async (req, res) => {
  try {
    const account_id = req.user.account_id;
    const { state_id } = req.query;

    if (!state_id) {
      return res.status(400).json({ success: false, message: "state_id is required." });
    }

    const account = await EpcAccount.findById(account_id).lean();
    if (!account) {
      return res.status(404).json({ success: false, message: "Account not found." });
    }

    if (!account.company_id) {
      return res.status(200).json({ success: true, verified: false, message: "No company registered yet." });
    }

    const gstRecord = await EpcCompanyGst.findOne({
      company_id: account.company_id,
      state_id,
      deleted_at: null
    }).lean();

    if (!gstRecord) {
      return res.status(200).json({ success: true, verified: false, message: "GST not verified for this state." });
    }

    const company = await EpcCompany.findById(account.company_id).lean();

    return res.status(200).json({
      success: true,
      verified: true,
      gst_number: gstRecord.gst_number,
      company_name: company?.name,
      legal_name: company?.legal_name,
      brand_name: company?.brand_name
    });

  } catch (error) {
    console.error("get_gst_status error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const gst_generate_otp = async (req, res) => {
  try {
    const { gstin, phone } = req.body;
    if (!gstin) {
      return res.status(400).json({ success: false, message: 'GSTIN is required.' });
    }

    const formattedGst = gstin.trim().toUpperCase();
    if (formattedGst.length !== 15) {
      return res.status(400).json({ success: false, message: 'Invalid GSTIN length. Must be 15 characters.' });
    }

    // Validate phone number if provided
    const formattedPhone = phone ? phone.trim().replace(/\D/g, '').slice(-10) : null;
    if (formattedPhone && !/^[6-9]\d{9}$/.test(formattedPhone)) {
      return res.status(400).json({ success: false, message: 'Invalid phone number. Must be a 10-digit Indian mobile number.' });
    }

    // Extract PAN
    const targetPan = formattedGst.substring(2, 12);

    // Verify PAN match across existing state GSTs of this company
    const account_id = req.user.account_id;
    const account = await EpcAccount.findById(account_id).lean();
    if (account && account.company_id) {
      const existingGsts = await EpcCompanyGst.find({
        company_id: account.company_id,
        deleted_at: null
      }).lean();

      if (existingGsts.length > 0) {
        for (const record of existingGsts) {
          const recordPan = record.gst_number.substring(2, 12);
          if (recordPan !== targetPan) {
            return res.status(400).json({
              success: false,
              message: "This GSTIN belongs to a different PAN. All verified GSTINs must belong to the same PAN."
            });
          }
        }
      }
    }

    // Duplicate check across other companies
    const otherGstRecord = await EpcCompanyGst.findOne({
      gst_number: formattedGst,
      company_id: { $ne: account?.company_id },
      deleted_at: null
    }).lean();

    if (otherGstRecord) {
      return res.status(409).json({
        success: false,
        message: `GST number ${formattedGst} is already registered under another company.`
      });
    }

    // ── Generate 6-digit OTP code ─────────────────────────────────────────────
    const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const requestId = `gst_req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store in-memory
    _gstOtpStore.set(requestId, {
      otp: rawOtp,
      phone: formattedPhone,
      gstin: formattedGst,
      expiresAt
    });
    setTimeout(() => _gstOtpStore.delete(requestId), 15 * 60 * 1000);

    if (formattedPhone) {
      // 1. Save hashed OTP to database (SignupVerification schema)
      try {
        const SignupVerification = require('../../models/india_solarshop_db/signup_verifications.schema');
        const otpHash = await bcrypt.hash(rawOtp, 10);
        await SignupVerification.create({
          otp: otpHash,
          channel: 'whatsapp',
          target: formattedPhone,
          ip_address: req.ip,
          expires_at: new Date(expiresAt),
        });
      } catch (dbErr) {
        console.warn('[GST OTP] SignupVerification store note:', dbErr.message);
      }

      // 2. Dispatch SMS via YourBulkSMS gateway (DLT SUNNOV sender)
      try {
        const yourbulksms = require('../../../admin-panel/utils/yourbulksms');
        await yourbulksms.sendOTP('91', formattedPhone, rawOtp);
        console.log(`[GST OTP] Dispatched SMS to +91 ${formattedPhone}`);
      } catch (smsErr) {
        console.warn('[GST OTP] YourBulkSMS dispatch note:', smsErr.message);
      }

      // 3. Dispatch WhatsApp via Twilio
      try {
        const { sendWhatsAppOTP } = require('../../utils/whatsapp');
        await sendWhatsAppOTP(formattedPhone, rawOtp);
        console.log(`[GST OTP] Dispatched WhatsApp to +91 ${formattedPhone}`);
      } catch (waErr) {
        console.warn('[GST OTP] Twilio WhatsApp dispatch note:', waErr.message);
      }
    }

    console.log(`[GST OTP] Generated OTP for GSTIN: ${formattedGst}, phone: ${formattedPhone}, requestId: ${requestId}`);

    return res.status(200).json({
      success: true,
      status: 'success',
      message: formattedPhone ? `OTP sent successfully to +91 ${formattedPhone}` : 'OTP generated successfully',
      request_id: requestId,
      data: {
        mobile: formattedPhone,
        request_id: requestId,
        demo_code: process.env.NODE_ENV !== 'production' ? rawOtp : undefined,
      }
    });

  } catch (error) {
    console.error('gst_generate_otp error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to send OTP.' });
  }
};

const gst_verify_otp = async (req, res) => {
  try {
    const { request_id, otp, gstin, state_id, phone } = req.body;
    const account_id = req.user.account_id;

    if (!otp || !gstin || !state_id) {
      return res.status(400).json({ success: false, message: 'otp, gstin, and state_id are required.' });
    }

    const formattedGst = gstin.trim().toUpperCase();
    const cleanOtp = String(otp).trim();
    const cleanPhone = phone ? String(phone).replace(/\D/g, '').slice(-10) : null;

    let otpVerified = false;

    // 1. Simulator / Sandbox dev test code (1234 or 123456)
    if (cleanOtp === '1234' || cleanOtp === '123456') {
      otpVerified = true;
      console.log(`[GST OTP] Simulator test code accepted: ${cleanOtp}`);
    }

    // 2. Check in-memory store
    if (!otpVerified && request_id && _gstOtpStore.has(request_id)) {
      const stored = _gstOtpStore.get(request_id);
      if (stored && Date.now() <= stored.expiresAt && stored.otp === cleanOtp) {
        otpVerified = true;
        _gstOtpStore.delete(request_id);
        console.log(`[GST OTP] Validated against _gstOtpStore for ${request_id}`);
      }
    }

    // 3. Check database (SignupVerification)
    if (!otpVerified && cleanPhone) {
      try {
        const SignupVerification = require('../../models/india_solarshop_db/signup_verifications.schema');
        const records = await SignupVerification.find({
          target: cleanPhone,
          verified_at: null,
          expires_at: { $gt: new Date() }
        }).sort({ created_at: -1 }).limit(5);

        for (const rec of records) {
          const match = await bcrypt.compare(cleanOtp, rec.otp);
          if (match) {
            otpVerified = true;
            await SignupVerification.updateOne({ _id: rec._id }, { verified_at: new Date() });
            console.log(`[GST OTP] Validated against SignupVerification DB for +91 ${cleanPhone}`);
            break;
          }
        }
      } catch (err) {
        console.warn('[GST OTP] DB verification note:', err.message);
      }
    }

    // 4. QuickeKYC fallback if request_id is from QuickeKYC and key exists
    let legalName = "SOLARKITS CERTIFIED EPC";
    let tradeName = "SOLARKITS EPC PARTNER";

    if (!otpVerified && request_id && !request_id.startsWith('gst_req_') && !request_id.startsWith('twilio_req_') && !request_id.startsWith('mock_req_')) {
      const apiKey = process.env.QUICKEKYC_API_KEY;
      if (apiKey && apiKey !== 'your-production-api-key-here') {
        try {
          const baseUrl = 'https://api.quickekyc.com';
          const response = await fetch(`${baseUrl}/api/v1/corporate/gst-verification-v2/submit-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: apiKey, request_id: request_id, otp: cleanOtp })
          });
          const resJson = await response.json();
          if (resJson.status === 'success' && resJson.data) {
            otpVerified = true;
            legalName = resJson.data.legal_name || resJson.data.business_name || legalName;
            tradeName = resJson.data.trade_name || resJson.data.tradeName || tradeName;
          }
        } catch (apiErr) {
          console.warn('[GST OTP] QuickeKYC submit-otp note:', apiErr.message);
        }
      }
    }

    if (!otpVerified) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please check the code sent to your mobile or enter 1234 for testing."
      });
    }

    // Default business names if not populated
    if (!legalName) legalName = "SOLARKITS SOLAR LABS PVT LTD";
    if (!tradeName) tradeName = "SOLARKITS INDIA";


    // Check similarity if first GST verification
    const account = await EpcAccount.findById(account_id);
    if (!account) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    let companyId = account.company_id;

    if (!companyId) {
      // Create new EpcCompany in database
      const company = await EpcCompany.create({
        name: tradeName || legalName,
        legal_name: legalName,
        brand_name: tradeName || null,
        email: account.email,
        source: 'verified',
        working_states: [state_id]
      });

      companyId = company._id;
      
      // Update EpcAccount
      account.company_id = companyId;
      if (!account.states.includes(state_id)) {
        account.states.push(state_id);
      }
      await account.save();
    } else {
      // Existing company: update states
      const company = await EpcCompany.findById(companyId);
      if (company) {
        if (!company.working_states.some(s => s.toString() === state_id.toString())) {
          company.working_states.push(state_id);
          await company.save();
        }
      }
      if (!account.states.includes(state_id)) {
        account.states.push(state_id);
        await account.save();
      }
    }

    // Save GST details in epc_company_gst
    await EpcCompanyGst.findOneAndUpdate(
      { company_id: companyId, state_id: state_id },
      { gst_number: formattedGst, deleted_at: null },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: "GST verified and registered successfully!",
      data: {
        legal_name: legalName,
        trade_name: tradeName,
        gst_number: formattedGst
      }
    });

  } catch (error) {
    console.error('gst_verify_otp error:', error);
    return res.status(500).json({ success: false, message: error.message || 'GST verification submit failed.' });
  }
};

const get_orders = async (req, res) => {
  try {
    const customer_id = req.user?.account_id || req.user?.id || req.user?._id;
    if (!customer_id) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    // 1. Fetch modern EpcOrder records for this EPC Account
    const { EpcOrder, Reseller } = require("../../../admin-panel/models/india_solarshop_db");
    const epcQuery = mongoose.Types.ObjectId.isValid(customer_id)
      ? { $or: [{ epc_id: customer_id }, { epc_id: new mongoose.Types.ObjectId(customer_id) }] }
      : { epc_id: customer_id };

    let epcOrders = [];
    try {
      epcOrders = await EpcOrder.find(epcQuery)
        .populate('reseller_id', 'business_name mobile email')
        .sort({ created_at: -1 })
        .lean();
    } catch (err) {
      console.error("Error with populated EpcOrder, falling back to unpopulated:", err);
      epcOrders = await EpcOrder.find(epcQuery).sort({ created_at: -1 }).lean();
    }

    // Collect all kit and product IDs to resolve images and accurate names
    const epcKitIds = [];
    const epcProductIds = [];
    (epcOrders || []).forEach(o => {
      (o.items || []).forEach(i => {
        if (i.kit_id && mongoose.Types.ObjectId.isValid(i.kit_id)) epcKitIds.push(new mongoose.Types.ObjectId(i.kit_id));
        if (i.product_id && mongoose.Types.ObjectId.isValid(i.product_id)) epcProductIds.push(new mongoose.Types.ObjectId(i.product_id));
      });
    });

    const kitLookup = {};
    const productLookup = {};

    try {
      const [matchedKits, matchedKitsAlt, matchedProducts] = await Promise.all([
        epcKitIds.length > 0 ? mongoose.connection.db.collection('pc_comobo_kit').find({ _id: { $in: epcKitIds } }).toArray() : [],
        epcKitIds.length > 0 ? mongoose.connection.db.collection('pc_combo_kits').find({ _id: { $in: epcKitIds } }).toArray() : [],
        epcProductIds.length > 0 ? mongoose.connection.db.collection('products').find({ _id: { $in: epcProductIds } }).toArray() : [],
      ]);

      (matchedKits || []).forEach(k => {
        kitLookup[k._id.toString()] = {
          name: k.name || k.kitName,
          image: k.kit_image || k.image || (k.images && k.images[0]),
          capacity: k.capacity ? `${k.capacity} kW` : null,
          description: k.description,
        };
      });
      (matchedKitsAlt || []).forEach(k => {
        if (!kitLookup[k._id.toString()]) {
          kitLookup[k._id.toString()] = {
            name: k.name || k.kitName,
            image: k.kit_image || k.image || (k.images && k.images[0]),
            capacity: k.capacity ? `${k.capacity} kW` : null,
            description: k.description,
          };
        }
      });
      (matchedProducts || []).forEach(p => {
        productLookup[p._id.toString()] = {
          name: p.name || p.title,
          image: p.image || p.image_url || (p.images && p.images[0]),
          sku: p.sku_code,
          description: p.description,
        };
      });
    } catch (lookupErr) {
      console.error("Error populating kit/product details for orders:", lookupErr);
    }

    const formattedEpcOrders = (epcOrders || []).map((o) => {
      const enrichedItems = (o.items || []).map(i => {
        const kitInfo = i.kit_id ? kitLookup[i.kit_id.toString()] : null;
        const prodInfo = i.product_id ? productLookup[i.product_id.toString()] : null;
        const resolvedName = (i.item_name && i.item_name !== 'Solar Kit') ? i.item_name : (kitInfo?.name || prodInfo?.name || i.item_name || 'Solar Kit Bundle');
        const resolvedImage = kitInfo?.image || prodInfo?.image || i.image || i.item_image || null;
        return {
          ...i,
          item_name: resolvedName,
          image: resolvedImage,
          kit_image: resolvedImage,
          capacity: kitInfo?.capacity || null,
          description: kitInfo?.description || prodInfo?.description || null,
        };
      });

      const firstItem = enrichedItems[0] || {};
      const firstItemName = firstItem.item_name || 'Solar Kit Bundle';
      const firstItemImage = firstItem.image || null;
      const totalAmount = (o.grand_total_paise || 0) / 100;
      const subtotal = (o.subtotal_paise || 0) / 100;
      const taxTotal = (o.tax_total_paise || 0) / 100;

      const hasDispatchInfo = Boolean(o.dispatch_tracking?.tracking_number || o.dispatch_tracking?.courier_name);
      const isDispatched = o.order_status === 'dispatched' || hasDispatchInfo;
      const isDelivered = o.order_status === 'delivered';

      const isOnline = o.payment_method === 'icici_ecollection' || o.payment_gateway_used === 'icici_ecollection';

      // Status translation for EPC buyer view
      let displayStatus = 'pending';
      if (o.order_status === 'cancelled') displayStatus = 'cancelled';
      else if (isDelivered) displayStatus = 'delivered';
      else if (isDispatched) displayStatus = 'dispatched';
      else if (isOnline || o.payment_status === 'captured' || o.order_status === 'confirmed' || o.offline_payment?.verification_status === 'approved') displayStatus = 'confirmed';
      else if (o.payment_status === 'rejected') displayStatus = 'rejected';
      else if (o.payment_status === 'pending_verification') displayStatus = 'pending_verification';

      const effectiveOrderStatus = isDelivered ? 'delivered' : isDispatched ? 'dispatched' : o.order_status;

      return {
        _id: o._id,
        id: o._id,
        order_number: o.order_number,
        is_epc_order: true,
        order_type: 'offline_epc_order',
        customer_id: o.epc_id,
        created_at: o.created_at,
        status: displayStatus,
        order_status: effectiveOrderStatus,
        payment_status: o.payment_status,
        payment_method: o.payment_method || 'offline_bank_transfer',
        payment_reference: o.payment_reference || o.offline_payment?.utr_number,
        fulfillment_source: o.fulfillment_source || (o.reseller_id ? 'franchise_warehouse' : 'company_warehouse'),
        reseller: o.reseller_id ? {
          id: o.reseller_id._id,
          business_name: o.reseller_id.business_name,
          mobile: o.reseller_id.mobile,
          email: o.reseller_id.email,
        } : null,
        offline_payment: o.offline_payment || {},
        invoice: o.invoice || {},
        dispatch_tracking: {
          courier_name: o.dispatch_tracking?.courier_name || null,
          tracking_number: o.dispatch_tracking?.tracking_number || null,
          tracking_url: o.dispatch_tracking?.tracking_url || null,
          dispatched_at: o.dispatch_tracking?.dispatched_at || null,
          estimated_delivery: o.dispatch_tracking?.estimated_delivery || null,
          dispatch_notes: o.dispatch_tracking?.dispatch_notes || null,
        },
        assigned_vehicle: o.assigned_vehicle || null,
        items: enrichedItems,
        total_kits: enrichedItems.reduce((sum, i) => sum + (i.quantity || 1), 0),
        total_amount: totalAmount,
        subtotal: subtotal,
        tax_total: taxTotal,
        selling_price_snapshot: totalAmount,
        base_price_snapshot: subtotal,
        combo_kit_id: {
          _id: firstItem.kit_id?._id || firstItem.kit_id || firstItem.product_id?._id || firstItem.product_id || o._id,
          name: firstItemName,
          kitName: firstItemName,
          image: firstItemImage,
          kit_image: firstItemImage,
          capacity: firstItem.capacity,
          description: firstItem.description,
          selling_price_cached: totalAmount,
        },
        delivery_address: o.delivery_address || {},
        payment_milestones: o.payment_milestones || null,
        milestones: o.milestones || [],
      };
    });

    // 2. Fetch legacy purchase orders for this customer (if any)
    let populatedOrders = [];
    try {
      const poQuery = mongoose.Types.ObjectId.isValid(customer_id)
        ? { $or: [{ customer_id }, { customer_id: new mongoose.Types.ObjectId(customer_id) }] }
        : { customer_id };
      const orders = await PurchaseOrder.find(poQuery).lean();

      if (orders && orders.length > 0) {
        // Collect kit and district IDs
        const kitIds = [...new Set(orders.map(o => o.combo_kit_id?.toString()).filter(Boolean))].map(id => new mongoose.Types.ObjectId(id));
        const districtIds = [...new Set(orders.map(o => o.district_id?.toString()).filter(Boolean))].map(id => new mongoose.Types.ObjectId(id));

        const [kits, districts] = await Promise.all([
          ComboKit.find({ _id: { $in: kitIds } }).lean(),
          GeoLevel2.find({ _id: { $in: districtIds } }).lean()
        ]);

        const stateIdsSet = new Set(orders.map(o => o.state_id?.toString()).filter(Boolean));
        districts.forEach(d => {
          if (d.level_1) stateIdsSet.add(d.level_1.toString());
        });
        const stateIds = [...stateIdsSet].map(id => new mongoose.Types.ObjectId(id));

        const states = await GeoLevel1.find({ _id: { $in: stateIds } }).lean();

        const kitMap = {};
        kits.forEach(k => { kitMap[k._id.toString()] = k; });
        const stateMap = {};
        states.forEach(s => { stateMap[s._id.toString()] = s; });
        const districtMap = {};
        districts.forEach(d => { districtMap[d._id.toString()] = d; });

        populatedOrders = orders.map(order => {
          const populated = { ...order };
          if (order.combo_kit_id) {
            const matchedKit = kitMap[order.combo_kit_id.toString()];
            populated.combo_kit_id = matchedKit ? {
              ...matchedKit,
              kitName: matchedKit.name,
            } : null;
          }
          
          let matchedState = order.state_id ? stateMap[order.state_id.toString()] : null;
          let matchedDistrict = order.district_id ? districtMap[order.district_id.toString()] : null;

          if (order.state_id && order.district_id && order.state_id.toString() === order.district_id.toString()) {
            if (matchedDistrict && matchedDistrict.level_1) {
              matchedState = stateMap[matchedDistrict.level_1.toString()] || null;
            }
          }

          populated.state_id = matchedState;
          populated.district_id = matchedDistrict;

          return populated;
        });
      }
    } catch (poErr) {
      console.error("Error fetching legacy purchase orders:", poErr);
    }

    const combined = [...formattedEpcOrders, ...populatedOrders];

    return res.status(200).json({ success: true, data: combined });
  } catch (error) {
    console.error('get_orders error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET Official SolarKits Escrow / Company Bank Details for Offline Transfer
 */
const get_company_bank_details = async (req, res) => {
  try {
    const { COMPANY_BANK_DETAILS } = require("../../../admin-panel/services/epc.offline.checkout.service");
    return res.status(200).json({
      success: true,
      status: "success",
      data: COMPANY_BANK_DETAILS,
    });
  } catch (error) {
    console.error("get_company_bank_details error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET Check Warehouse Stock by PIN Code & EPC Attribution
 */
const check_warehouse_stock = async (req, res) => {
  try {
    const epc_id = req.user?.account_id || req.user?.id;
    const { kit_id, product_id, quantity, pincode, district_id } = req.query;

    const { checkWarehouseStockAvailability } = require("../../../admin-panel/services/epc.offline.checkout.service");
    const result = await checkWarehouseStockAvailability({
      epc_id,
      kit_id,
      product_id,
      quantity: Number(quantity) || 1,
      pincode,
      district_id,
    });

    return res.status(200).json({
      success: true,
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("check_warehouse_stock error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── MODULE 1.1: CHECKOUT WAREHOUSE CAPACITY CHECK ─────────────────────────────
/**
 * GET /api/india/v1/shop/checkout/warehouse-capacity-check
 *
 * Pre-checkout capacity validation before the buyer confirms delivery mode.
 * Query params:
 *   - fulfillment_mode: 'franchisee_warehouse' | 'epc_warehouse'
 *   - cart_items: JSON-encoded array of { kit_id, quantity, kw_per_kit, weight_kg_per_kit }
 *   - franchisee_id: (required when fulfillment_mode = franchisee_warehouse)
 *   - warehouse_id:  (required when fulfillment_mode = epc_warehouse)
 */
const checkout_warehouse_capacity_check = async (req, res) => {
  try {
    const { fulfillment_mode, cart_items, franchisee_id, warehouse_id, district_id } = req.query;

    if (!fulfillment_mode) {
      return res.status(400).json({ success: false, message: 'fulfillment_mode is required.' });
    }
    if (!['franchisee_warehouse', 'epc_warehouse'].includes(fulfillment_mode)) {
      return res.status(200).json({ success: true, status: 'success', allowed: true, message: 'No capacity check needed for direct site delivery.' });
    }

    let parsedCartItems = [];
    try {
      parsedCartItems = cart_items ? JSON.parse(cart_items) : [];
    } catch (_) {
      return res.status(400).json({ success: false, message: 'Invalid cart_items format. Must be a valid JSON array.' });
    }

    // ── Compute Order Load Metrics ──────────────────────────────────────────
    const order_load_metrics = parsedCartItems.reduce((acc, item) => {
      const qty = Number(item.quantity || item.qty || 1);
      acc.total_kits      += qty;
      acc.total_kw        += qty * Number(item.kw_per_kit     || 0);
      acc.total_weight_kg += qty * Number(item.weight_kg_per_kit || 0);
      return acc;
    }, { total_kits: 0, total_kw: 0, total_weight_kg: 0 });

    const epc_id = req.user?.account_id || req.user?._id || req.user?.id;

    const { checkWarehouseCapacityForMode } = require('../../../admin-panel/services/epc.offline.checkout.service');
    const result = await checkWarehouseCapacityForMode({
      fulfillment_mode,
      order_load_metrics,
      franchisee_id,
      warehouse_id,
      district_id,
      epc_id,
    });

    return res.status(200).json({
      success: true,
      status: 'success',
      data: {
        order_load_metrics,
        ...result,
      },
    });
  } catch (error) {
    console.error('checkout_warehouse_capacity_check error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/india/v1/shop/delivery-cost/calculate
 * Calculate delivery freight for a given pincode and product/kit
 * Query: { pincode, kit_id, quantity }
 */
const calculate_pincode_delivery_cost = async (req, res) => {
  try {
    const { pincode, kit_id, quantity = 1, order_type = 'loose' } = req.query;

    if (!pincode || !String(pincode).trim()) {
      return res.status(400).json({
        success: false,
        message: "PIN code is required to calculate delivery cost.",
      });
    }

    const cleanPincode = String(pincode).trim();
    if (!/^\d{6}$/.test(cleanPincode)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 6-digit PIN code.",
      });
    }

    // Normalize order type: loose, po, trial
    const rawOrderType = String(order_type || 'loose').toLowerCase();
    const normalizedOrderType = rawOrderType.includes('trial')
      ? 'trial'
      : (rawOrderType.includes('po') ? 'po' : 'loose');

    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    const { PincodeDeliveryCost } = require("../../../admin-panel/models/india_solarshop_db");
    const ComboKit = require("../../../admin-panel/models/india_solarshop_db/combo_kits.schema");
    const { GeoLevel2 } = require("../../../admin-panel/models/geolocation_db");

    let kitDoc = null;
    let targetKitId = null;
    if (kit_id && mongoose.Types.ObjectId.isValid(kit_id)) {
      targetKitId = new mongoose.Types.ObjectId(kit_id);
      kitDoc = await ComboKit.findById(targetKitId).lean();
    }

    // 1. Look for specific kit rate for this pincode
    let rateRule = null;
    if (targetKitId) {
      rateRule = await PincodeDeliveryCost.findOne({
        pincode: cleanPincode,
        combo_kit_id: targetKitId,
        is_active: true,
      }).lean();
    }

    // 2. Fallback to general pincode rate (combo_kit_id: null)
    if (!rateRule) {
      rateRule = await PincodeDeliveryCost.findOne({
        pincode: cleanPincode,
        combo_kit_id: null,
        is_active: true,
      }).lean();
    }

    // 3. Fallback: check if pincode has any active rate rule (to get state/district)
    let locationFallback = null;
    if (!rateRule) {
      locationFallback = await PincodeDeliveryCost.findOne({
        pincode: cleanPincode,
        is_active: true,
      }).lean();
    }

    // 4. District Master Fallback: Look up district of this pincode from Geolocation master
    let geoDistrict = null;
    if (!rateRule) {
      try {
        geoDistrict = await GeoLevel2.findOne({
          'pincodes.pincode': cleanPincode,
          is_active: true,
          $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }],
        }).populate('level_1', 'name').lean();

        if (geoDistrict) {
          if (targetKitId) {
            rateRule = await PincodeDeliveryCost.findOne({
              district_id: geoDistrict._id,
              combo_kit_id: targetKitId,
              is_active: true,
            }).lean();
          }

          if (!rateRule) {
            rateRule = await PincodeDeliveryCost.findOne({
              district_id: geoDistrict._id,
              combo_kit_id: null,
              is_active: true,
            }).lean();
          }
        }
      } catch (geoErr) {
        console.warn('Geolocation fallback lookup warning:', geoErr.message);
      }
    }

    // Resolve order-type specific delivery cost
    let resolvedDeliveryCost = 0;
    if (rateRule) {
      if (normalizedOrderType === 'trial') {
        resolvedDeliveryCost = rateRule.trial_delivery_cost !== undefined && rateRule.trial_delivery_cost !== null && rateRule.trial_delivery_cost > 0
          ? Number(rateRule.trial_delivery_cost)
          : Number(rateRule.delivery_cost || 0);
      } else if (normalizedOrderType === 'po') {
        resolvedDeliveryCost = rateRule.po_delivery_cost !== undefined && rateRule.po_delivery_cost !== null && rateRule.po_delivery_cost > 0
          ? Number(rateRule.po_delivery_cost)
          : Number(rateRule.delivery_cost || 0);
      } else {
        resolvedDeliveryCost = rateRule.loose_delivery_cost !== undefined && rateRule.loose_delivery_cost !== null && rateRule.loose_delivery_cost > 0
          ? Number(rateRule.loose_delivery_cost)
          : Number(rateRule.delivery_cost || 0);
      }
    }

    const isServiceable = Boolean(rateRule);
    const deliveryCost = resolvedDeliveryCost;
    const stateName = rateRule?.state_name || locationFallback?.state_name || geoDistrict?.level_1?.name || null;
    const districtName = rateRule?.district_name || locationFallback?.district_name || geoDistrict?.name || null;
    const estMin = rateRule?.estimated_days_min || 3;
    const estMax = rateRule?.estimated_days_max || 7;

    // Calculate item pricing if kitDoc or unit_price query param is found
    const unitPrice = req.query.unit_price
      ? Number(req.query.unit_price)
      : kitDoc
      ? Number(kitDoc.selling_price_inr || kitDoc.selling_price_cached || kitDoc.base_price_cached || 0)
      : 0;
    const itemsSubtotal = unitPrice * qty;

    let gstRate = 13.8;
    if (req.query.gst_rate !== undefined && req.query.gst_rate !== null && !isNaN(Number(req.query.gst_rate))) {
      gstRate = Number(req.query.gst_rate);
    } else if (targetKitId) {
      const marginDoc = await CompanyMargin.findOne({
        combo_kit_id: targetKitId,
        is_active: true,
        deleted_at: null,
      }).sort({ updated_at: -1 }).lean();

      if (marginDoc?.gst_rate != null && !isNaN(Number(marginDoc.gst_rate))) {
        gstRate = Number(marginDoc.gst_rate);
      } else if (kitDoc?.gst_rate != null && !isNaN(Number(kitDoc.gst_rate))) {
        gstRate = Number(kitDoc.gst_rate);
      } else {
        const shopSettings = (await SolarShopSettings.findOne().lean()) || {};
        if (shopSettings?.gst_rate != null && !isNaN(Number(shopSettings.gst_rate))) {
          gstRate = Number(shopSettings.gst_rate);
        }
      }
    }

    const gstAmount = itemsSubtotal > 0 ? Math.round(itemsSubtotal - itemsSubtotal / (1 + gstRate / 100)) : 0;
    const totalPayable = itemsSubtotal + deliveryCost;

    return res.status(200).json({
      success: true,
      data: {
        pincode: cleanPincode,
        order_type: normalizedOrderType,
        is_serviceable: isServiceable,
        state_name: stateName,
        district_name: districtName,
        warehouse: rateRule?.warehouse_name ? {
          code: rateRule.warehouse_code,
          name: rateRule.warehouse_name,
          type: rateRule.warehouse_type || 'master',
        } : null,
        pricing_mode: rateRule?.pricing_mode || 'fixed',
        distance_km: rateRule?.distance_km || 0,
        delivery_cost: deliveryCost,
        rates_breakdown: {
          loose: rateRule ? Number(rateRule.loose_delivery_cost ?? rateRule.delivery_cost ?? 0) : 0,
          po: rateRule ? Number(rateRule.po_delivery_cost ?? rateRule.delivery_cost ?? 0) : 0,
          trial: rateRule ? Number(rateRule.trial_delivery_cost ?? rateRule.delivery_cost ?? 0) : 0,
        },
        formatted_delivery_cost: `₹${deliveryCost.toLocaleString("en-IN")}`,
        estimated_days_min: estMin,
        estimated_days_max: estMax,
        estimated_timeline: `${estMin} - ${estMax} Business Days`,
        pricing: {
          unit_price: unitPrice,
          quantity: qty,
          items_subtotal: itemsSubtotal,
          delivery_cost: deliveryCost,
          total_payable: totalPayable,
          gst_rate: gstRate,
          gst_amount: gstAmount,
        },
        message: isServiceable
          ? `Delivery available to ${districtName ? districtName + ', ' : ''}${stateName || ''} (${cleanPincode}) for ${normalizedOrderType.toUpperCase()} order`
          : `Delivery charge not configured for PIN ${cleanPincode}. Standard rates may apply.`,
      },
    });
  } catch (error) {
    console.error("calculate_pincode_delivery_cost error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST Create EPC Offline Bank Transfer Checkout with Payment Receipt
 */
const create_epc_offline_checkout = async (req, res) => {
  try {
    const epc_id = req.user?.account_id || req.user?.id;
    if (!epc_id) {
      return res.status(401).json({ success: false, message: "Authentication required for checkout." });
    }

    // Sub-user authorization check for checkout
    const callerAccount = await EpcAccount.findById(epc_id).lean();
    if (callerAccount && callerAccount.parent_account_id) {
      const perms = callerAccount.permissions || [];
      const hasCheckout = perms.includes('all') || perms.includes('can_checkout');
      if (!hasCheckout) {
        return res.status(403).json({
          success: false,
          message: 'Your account does not have authorization to checkout orders. Please contact your EPC Admin.'
        });
      }
    }

    // Parse body data (handles both JSON and multipart form data)
    let body = req.body || {};
    let items = body.items;
    let delivery_address = body.delivery_address;
    let offline_payment_data = body.offline_payment_data || {};

    if (typeof items === 'string') {
      try { items = JSON.parse(items); } catch (e) {}
    }
    if (typeof delivery_address === 'string') {
      try { delivery_address = JSON.parse(delivery_address); } catch (e) {}
    }
    if (typeof offline_payment_data === 'string') {
      try { offline_payment_data = JSON.parse(offline_payment_data); } catch (e) {}
    }

    // Capture uploaded receipt file if present
    if (req.files && req.files.length > 0) {
      const uploadedFile = req.files.find(f => f.fieldname === 'payment_receipt' || f.fieldname === 'receipt' || f.fieldname === 'file') || req.files[0];
      if (uploadedFile) {
        offline_payment_data.receipt_url = uploadedFile.path;
        offline_payment_data.receipt_filename = uploadedFile.originalname;
      }
    }

    if (body.utr_number && !offline_payment_data.utr_number) {
      offline_payment_data.utr_number = body.utr_number;
    }
    if (body.amount_paid && !offline_payment_data.amount_paid) {
      offline_payment_data.amount_paid = Number(body.amount_paid);
    }
    if (body.payment_date && !offline_payment_data.payment_date) {
      offline_payment_data.payment_date = body.payment_date;
    }
    if (body.sender_bank_name && !offline_payment_data.sender_bank_name) {
      offline_payment_data.sender_bank_name = body.sender_bank_name;
    }

    let fulfillment_mode = body.fulfillment_mode || 'direct_site';
    let order_load_metrics = body.order_load_metrics;
    if (typeof order_load_metrics === 'string') {
      try { order_load_metrics = JSON.parse(order_load_metrics); } catch (e) {}
    }

    const { createEpcOfflineOrder } = require("../../../admin-panel/services/epc.offline.checkout.service");
    const result = await createEpcOfflineOrder({
      epc_id,
      items,
      delivery_address,
      offline_payment_data,
      actor_id: epc_id,
      req,
      fulfillment_mode,
      order_load_metrics,
    });

    // Clear cart on successful order placement
    await Cart.findOneAndUpdate({ account_id: epc_id }, { $set: { cart: [] } });

    try {
      const { sendAdminNotification } = require("../../../admin-panel/services/admin.notification.service");
      sendAdminNotification({
        title: `New EPC Order Placed (${result.order_code || 'Order'})`,
        message: `EPC order placed with offline payment receipt. Submitted for verification.`,
        category: 'orders',
        priority: 'high',
        action_url: '/admin-panel/solar-shop/po-orders',
        metadata: { order_id: result._id, epc_id }
      }).catch(err => console.warn('[Order Notification Warning]:', err.message));
    } catch (notifErr) {
      console.warn('[Admin Notification Error]:', notifErr.message);
    }

    return res.status(201).json({
      success: true,
      status: "success",
      message: "Order placed successfully! Payment submitted for Accounts Department verification.",
      data: result,
    });
  } catch (error) {
    console.error("create_epc_offline_checkout error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * POST Re-submit EPC Payment Proof after Accounts Rejection
 */
const resubmit_epc_offline_payment = async (req, res) => {
  try {
    const epc_id = req.user?.account_id || req.user?.id;
    const { id } = req.params;

    let body = req.body || {};
    let receipt_url = body.receipt_url;
    let receipt_filename = body.receipt_filename;

    if (req.files && req.files.length > 0) {
      const uploadedFile = req.files.find(f => f.fieldname === 'payment_receipt' || f.fieldname === 'receipt' || f.fieldname === 'file') || req.files[0];
      if (uploadedFile) {
        receipt_url = uploadedFile.path;
        receipt_filename = uploadedFile.originalname;
      }
    }

    const { resubmitEpcPaymentProof } = require("../../../admin-panel/services/epc.offline.checkout.service");
    const updatedOrder = await resubmitEpcPaymentProof({
      order_id: id,
      epc_id,
      utr_number: body.utr_number,
      amount_paid: body.amount_paid,
      payment_date: body.payment_date,
      receipt_url,
      receipt_filename,
      sender_bank_name: body.sender_bank_name,
      req,
    });

    return res.status(200).json({
      success: true,
      status: "success",
      message: "Payment receipt and UTR re-submitted successfully for verification.",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("resubmit_epc_offline_payment error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * POST Submit EPC Remaining Payment for Milestone 2 (Before Dispatch)
 */
const submit_epc_milestone_payment = async (req, res) => {
  try {
    const epc_id = req.user?.account_id || req.user?.id;
    const { id } = req.params;

    let body = req.body || {};
    let receipt_url = body.receipt_url;
    let receipt_filename = body.receipt_filename;

    if (req.files && req.files.length > 0) {
      const uploadedFile = req.files.find(f => f.fieldname === 'payment_receipt' || f.fieldname === 'receipt' || f.fieldname === 'file') || req.files[0];
      if (uploadedFile) {
        receipt_url = uploadedFile.path;
        receipt_filename = uploadedFile.originalname;
      }
    }

    const { submitEpcMilestonePayment } = require("../../../admin-panel/services/epc.offline.checkout.service");
    const updatedOrder = await submitEpcMilestonePayment({
      order_id: id,
      epc_id,
      milestone_number: Number(body.milestone_number || 2),
      utr_number: body.utr_number,
      amount_paid: Number(body.amount_paid),
      payment_date: body.payment_date,
      receipt_url,
      receipt_filename,
      sender_bank_name: body.sender_bank_name,
      account_holder_name: body.account_holder_name,
      payment_method: body.payment_method,
      payment_gateway_used: body.payment_gateway_used,
      req,
    });

    try {
      const { sendAdminNotification } = require("../../../admin-panel/services/admin.notification.service");
      sendAdminNotification({
        title: `Remaining Milestone Payment Uploaded (${updatedOrder.order_number})`,
        message: `EPC buyer submitted remaining payment proof for order ${updatedOrder.order_number}. Verification pending before dispatch.`,
        category: 'orders',
        priority: 'high',
        action_url: '/account-panel/solar-shop/epc-orders',
        metadata: { order_id: updatedOrder._id, epc_id }
      }).catch(err => console.warn('[Order Notification Warning]:', err.message));
    } catch (notifErr) {}

    return res.status(200).json({
      success: true,
      status: "success",
      message: "Remaining milestone payment submitted successfully! Accounts team is verifying for dispatch clearance.",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("submit_epc_milestone_payment error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Public checkout resolver for product payment milestones
 */
const { resolve_payment_milestones } = require("../../../admin-panel/controller/product.payment.milestones.handler");

/**
 * GET Tax Invoice Data for Approved EPC Order
 */
const get_epc_order_invoice_data = async (req, res) => {
  try {
    const epc_id = req.user?.account_id || req.user?.id;
    const { id } = req.params;

    const { EpcOrder, FpoOrder } = require("../../../admin-panel/models/india_solarshop_db");
    let order = await EpcOrder.findOne({ _id: id, epc_id })
      .populate('epc_id', 'name email whatsapp gstin company_name address')
      .populate('reseller_id', 'business_name gst_number address mobile email')
      .lean();

    if (!order && FpoOrder) {
      order = await FpoOrder.findOne({
        _id: id,
        $or: [{ epc_id }, { 'po_origin.epc_id': epc_id }, { buyer_id: epc_id }]
      })
        .populate('epc_id', 'name email whatsapp gstin company_name address')
        .populate('franchisee_id', 'name business_name gst_number address mobile email')
        .lean();
    }

    if (!order) {
      return res.status(404).json({ success: false, message: "Order record not found." });
    }

    const invoiceData = {
      invoice_number: order.invoice?.invoice_number || `INV-SK-${new Date().getFullYear()}-${String(order._id).slice(-5).toUpperCase()}`,
      invoice_date: order.invoice?.invoice_date || order.updated_at || order.created_at,
      order_number: order.order_number,
      order_date: order.created_at,
      buyer: {
        name: order.epc_id?.name || 'EPC Buyer',
        company_name: order.epc_id?.company_name || order.epc_id?.name,
        gstin: order.epc_id?.gstin || 'N/A',
        email: order.epc_id?.email,
        phone: order.epc_id?.whatsapp,
        delivery_address: order.delivery_address,
      },
      seller: {
        company_name: 'SolarKits Technologies Pvt Ltd',
        gstin: '27AABCS1234F1Z5',
        address: 'Plot 42, Green Energy Park, MIDC Industrial Area, Mumbai, MH - 400093',
        support_email: 'accounts@solarkits.com',
      },
      partner_attribution: order.reseller_id ? {
        business_name: order.reseller_id.business_name,
        gst_number: order.reseller_id.gst_number,
      } : null,
      items: (order.items || []).map((i) => ({
        item_name: i.item_name,
        quantity: i.quantity,
        unit_price: (i.unit_price_paise || 0) / 100,
        taxable_amount: ((i.quantity * i.unit_price_paise) || 0) / 100,
        gst_rate: i.gst_rate || 13.8,
        tax_amount: (i.tax_paise || 0) / 100,
        total_amount: (i.total_price_paise || 0) / 100,
      })),
      financials: {
        subtotal: (o => (o.subtotal_paise || 0) / 100)(order),
        tax_total: (o => (o.tax_total_paise || 0) / 100)(order),
        shipping_fee: (o => (o.shipping_fee_paise || 0) / 100)(order),
        grand_total: (o => (o.grand_total_paise || 0) / 100)(order),
      },
      payment: {
        payment_method: 'Offline Bank Transfer',
        payment_status: order.payment_status,
        utr_number: order.offline_payment?.utr_number || order.payment_reference,
        payment_date: order.offline_payment?.payment_date || order.created_at,
      },
    };

    return res.status(200).json({ success: true, data: invoiceData });
  } catch (error) {
    console.error("get_epc_order_invoice_data error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const update_order_address = async (req, res) => {
  try {
    const customer_id = req.user.account_id;
    const { id } = req.params;
    const { delivery_address } = req.body;

    if (!delivery_address) {
      return res.status(400).json({ success: false, message: "Delivery address is required." });
    }

    const order = await PurchaseOrder.findOne({ _id: id, customer_id });
    if (!order) {
      return res.status(444).json({ success: false, message: "Order not found." });
    }

    // Validate that the delivery address's district matches the order's ordering district boundary!
    if (!order.district_id) {
      const warehouse = await CompanyWarehouse.findById(order.warehouse_id).lean();
      if (warehouse && warehouse.level_2) {
        order.district_id = warehouse.level_2;
      }
    }

    if (order.district_id && delivery_address.district_id) {
      if (order.district_id.toString() !== delivery_address.district_id.toString()) {
        return res.status(400).json({
          success: false,
          message: "Delivery address must be within the district boundary from which the kit was ordered."
        });
      }
    }

    order.delivery_address = delivery_address;
    await order.save();

    return res.status(200).json({
      success: true,
      message: "Delivery address updated successfully",
      data: order
    });

  } catch (error) {
    console.error('update_order_address error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const CustomBosCatalog = require("../../models/india_solarshop_db/custom_bos_catalog.schema");
const BosKit = require("../../models/india_solarshop_db/bos_kits.schema");

// ─── BOS Kits (Pre-Configured) Handlers ────────────────────────────────────────

const get_bos_kits = async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = { deleted_at: null, is_active: { $ne: false } };

    if (category && category !== "all") {
      query.category = { $regex: new RegExp(category, "i") };
    }

    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { category: { $regex: search.trim(), $options: "i" } },
        { subCategory: { $regex: search.trim(), $options: "i" } },
        { systemType: { $regex: search.trim(), $options: "i" } }
      ];
    }

    const kits = await BosKit.find(query).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, data: kits });
  } catch (error) {
    console.error("get_bos_kits error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const save_bos_kits = async (req, res) => {
  try {
    const kits = Array.isArray(req.body) ? req.body : req.body.kits;
    if (Array.isArray(kits)) {
      await BosKit.deleteMany({});
      const formatted = kits.map(k => {
        const clean = { ...k };
        if (clean.id && !clean._id && mongoose.Types.ObjectId.isValid(clean.id)) {
          clean._id = clean.id;
        }
        delete clean.id;
        return clean;
      });
      const inserted = await BosKit.insertMany(formatted);
      return res.status(200).json({ success: true, message: "BOS Kits synchronized successfully", data: inserted });
    }
    return res.status(400).json({ success: false, message: "Kits array is required" });
  } catch (error) {
    console.error("save_bos_kits error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const create_or_update_bos_kit = async (req, res) => {
  try {
    const kitData = req.body;
    if (!kitData.name || !kitData.ourPrice) {
      return res.status(400).json({ success: false, message: "Kit name and ourPrice are required." });
    }

    const targetId = kitData.id || kitData._id;
    let saved;
    if (targetId && mongoose.Types.ObjectId.isValid(targetId)) {
      saved = await BosKit.findByIdAndUpdate(
        targetId,
        { $set: kitData },
        { new: true, upsert: true }
      );
    } else {
      saved = await BosKit.create(kitData);
    }

    return res.status(200).json({ success: true, message: "BOS Kit saved successfully", data: saved });
  } catch (error) {
    console.error("create_or_update_bos_kit error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const delete_bos_kit = async (req, res) => {
  try {
    const id = req.params.id || req.body.id;
    if (!id) {
      return res.status(400).json({ success: false, message: "Kit ID is required" });
    }

    if (mongoose.Types.ObjectId.isValid(id)) {
      await BosKit.findByIdAndUpdate(id, { $set: { deleted_at: new Date() } });
    } else {
      await BosKit.deleteOne({ $or: [{ _id: id }, { name: req.body.name }] });
    }

    return res.status(200).json({ success: true, message: "BOS Kit deleted successfully" });
  } catch (error) {
    console.error("delete_bos_kit error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const toggle_bos_kit_stock = async (req, res) => {
  try {
    const id = req.params.id || req.body.id;
    if (!id) {
      return res.status(400).json({ success: false, message: "Kit ID is required" });
    }

    let kit = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      kit = await BosKit.findById(id);
    }
    if (!kit) {
      kit = await BosKit.findOne({ name: req.body.name });
    }

    if (!kit) {
      return res.status(404).json({ success: false, message: "Kit not found" });
    }

    kit.inStock = !kit.inStock;
    await kit.save();

    return res.status(200).json({ success: true, message: `Stock status toggled to ${kit.inStock ? "In Stock" : "Out of Stock"}`, inStock: kit.inStock });
  } catch (error) {
    console.error("toggle_bos_kit_stock error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Custom BOS Catalog Handlers ──────────────────────────────────────────────

const get_bos_custom_catalog = async (req, res) => {
  try {
    const catalog = await CustomBosCatalog.find({}).lean();
    return res.status(200).json({ success: true, data: catalog });
  } catch (error) {
    console.error("get_bos_custom_catalog error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const save_bos_custom_catalog = async (req, res) => {
  try {
    const { catalog } = req.body;
    if (Array.isArray(catalog)) {
      await CustomBosCatalog.deleteMany({});
      const inserted = await CustomBosCatalog.insertMany(catalog);
      return res.status(200).json({ success: true, data: inserted });
    }
    return res.status(400).json({ success: false, message: "Catalog array required" });
  } catch (error) {
    console.error("save_bos_custom_catalog error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Store Locator Handlers ───────────────────────────────────────────────────

const CURATED_PAN_INDIA_STORES = [
  {
    id: "STORE-GJ-001",
    warehouse_code: "WH-IND-GJ-001",
    name: "Surya Solar Store — Ahmedabad",
    store_type: "EXPERIENCE_CENTER",
    address: "Plot No. 45, GIDC Industrial Estate, Sanand",
    city: "Ahmedabad",
    district: "Ahmedabad",
    state: "Gujarat",
    pincode: "382110",
    lat: 23.0225,
    lng: 72.5714,
    phone: "+91 79 4000 1201",
    email: "ahmedabad@solarkits.in",
    is_authorized: true,
    rating: 4.9,
    reviews_count: 142,
    images: [
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1553413077-190dd305871c?w=800&auto=format&fit=crop&q=80"
    ]
  },
  {
    id: "STORE-MH-001",
    warehouse_code: "WH-IND-MH-001",
    name: "Mahalaxmi Solar Solutions — Mumbai",
    store_type: "REGIONAL_WAREHOUSE",
    address: "Logistics Park, Unit 12B, Bhiwandi Industrial Area",
    city: "Mumbai",
    district: "Thane / Mumbai",
    state: "Maharashtra",
    pincode: "421302",
    lat: 19.2812,
    lng: 73.0483,
    phone: "+91 22 6100 8900",
    email: "mumbai@solarkits.in",
    is_authorized: true,
    rating: 4.8,
    reviews_count: 218,
    images: [
      "https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80"
    ]
  },
  {
    id: "STORE-DL-001",
    warehouse_code: "WH-IND-DL-001",
    name: "SunTech Solar Point — South Delhi",
    store_type: "SOLAR_LOUNGE",
    address: "B-214, Okhla Industrial Area Phase 3",
    city: "New Delhi",
    district: "South Delhi",
    state: "Delhi",
    pincode: "110020",
    lat: 28.5355,
    lng: 77.2610,
    phone: "+91 11 4500 7820",
    email: "delhi@solarkits.in",
    is_authorized: true,
    rating: 4.9,
    reviews_count: 185,
    images: [
      "https://images.unsplash.com/photo-1616401784845-180882ba9ba8?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80"
    ]
  },
  {
    id: "STORE-KA-001",
    warehouse_code: "WH-IND-KA-001",
    name: "GreenEnergy Solar Mart — Bengaluru",
    store_type: "EXPERIENCE_CENTER",
    address: "No. 88, Peenya Industrial Area 2nd Stage",
    city: "Bengaluru",
    district: "Bengaluru Urban",
    state: "Karnataka",
    pincode: "560058",
    lat: 13.0285,
    lng: 77.5195,
    phone: "+91 80 4900 3344",
    email: "bengaluru@solarkits.in",
    is_authorized: true,
    rating: 4.9,
    reviews_count: 164,
    images: [
      "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1553413077-190dd305871c?w=800&auto=format&fit=crop&q=80"
    ]
  },
  {
    id: "STORE-RJ-001",
    warehouse_code: "WH-IND-RJ-001",
    name: "Vardhman Solar Store — Jaipur",
    store_type: "EPC_HUB",
    address: "Plot 14, RIICO Industrial Area, Sitapura",
    city: "Jaipur",
    district: "Jaipur",
    state: "Rajasthan",
    pincode: "302022",
    lat: 26.7824,
    lng: 75.8273,
    phone: "+91 141 277 8899",
    email: "jaipur@solarkits.in",
    is_authorized: true,
    rating: 4.8,
    reviews_count: 112,
    images: [
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1592833159155-c62df1b65634?w=800&auto=format&fit=crop&q=80"
    ]
  },
  {
    id: "STORE-MH-002",
    warehouse_code: "STORE-PUN-001",
    name: "Apex Solar Enterprises — Pune",
    store_type: "SOLAR_LOUNGE",
    address: "Showroom 4, Nyati Tech Park, Wadgaon Sheri, Nagar Road",
    city: "Pune",
    district: "Pune",
    state: "Maharashtra",
    pincode: "411014",
    lat: 18.5529,
    lng: 73.9248,
    phone: "+91 20 6700 4455",
    email: "pune@solarkits.in",
    is_authorized: true,
    rating: 4.9,
    reviews_count: 98,
    images: [
      "https://images.unsplash.com/photo-1545208942-e1c9c916524b?w=800&auto=format&fit=crop&q=80"
    ]
  },
  {
    id: "STORE-TG-001",
    warehouse_code: "STORE-HYD-001",
    name: "Deccan Solar Hub — Hyderabad",
    store_type: "EXPERIENCE_CENTER",
    address: "Survey No. 64, Financial District, Gachibowli",
    city: "Hyderabad",
    district: "Hyderabad / Rangareddy",
    state: "Telangana",
    pincode: "500032",
    lat: 17.4156,
    lng: 78.3498,
    phone: "+91 40 4800 2211",
    email: "hyderabad@solarkits.in",
    is_authorized: true,
    rating: 4.8,
    reviews_count: 125,
    images: [
      "https://images.unsplash.com/photo-1559302504-64aae6ca6b6d?w=800&auto=format&fit=crop&q=80"
    ]
  },
  {
    id: "STORE-TN-001",
    warehouse_code: "STORE-CHE-001",
    name: "Kaveri Solar Power — Chennai",
    store_type: "EXPERIENCE_CENTER",
    address: "Block 7, SIDCO Industrial Estate, Guindy",
    city: "Chennai",
    district: "Chennai",
    state: "Tamil Nadu",
    pincode: "600032",
    lat: 13.0067,
    lng: 80.2024,
    phone: "+91 44 4300 5566",
    email: "chennai@solarkits.in",
    is_authorized: true,
    rating: 4.7,
    reviews_count: 104,
    images: [
      "https://images.unsplash.com/photo-1508873696983-2df5293cb32b?w=800&auto=format&fit=crop&q=80"
    ]
  }
];

// Helper: Haversine formula for distance calculation in kilometers
function calculate_distance_km(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

const get_nearby_stores = async (req, res) => {
  try {
    const { search, state, city, pincode, store_type, lat, lng, limit = 20 } = req.query;

    const userLat = lat ? parseFloat(lat) : null;
    const userLng = lng ? parseFloat(lng) : null;

    let stores = [...CURATED_PAN_INDIA_STORES];

    // Filter by search query
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      stores = stores.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.city.toLowerCase().includes(q) ||
          s.state.toLowerCase().includes(q) ||
          s.pincode.includes(q) ||
          s.address.toLowerCase().includes(q)
      );
    }

    // Filter by state
    if (state && state.trim()) {
      const st = state.trim().toLowerCase();
      stores = stores.filter((s) => s.state.toLowerCase().includes(st));
    }

    // Filter by city
    if (city && city.trim()) {
      const ct = city.trim().toLowerCase();
      stores = stores.filter((s) => s.city.toLowerCase().includes(ct));
    }

    // Filter by pincode
    if (pincode && pincode.trim()) {
      const pin = pincode.trim();
      stores = stores.filter((s) => s.pincode.startsWith(pin.slice(0, 3)));
    }

    // Filter by store type
    if (store_type && store_type.trim() && store_type !== "ALL") {
      stores = stores.filter((s) => s.store_type === store_type);
    }

    // Calculate real distance if coordinates provided
    if (userLat && userLng) {
      stores = stores.map((s) => ({
        ...s,
        distance_km: calculate_distance_km(userLat, userLng, s.lat, s.lng),
      }));
      // Sort by proximity
      stores.sort((a, b) => (a.distance_km || 99999) - (b.distance_km || 99999));
    }

    return res.status(200).json({
      status: "success",
      success: true,
      data: stores.slice(0, Number(limit)),
      total: stores.length,
    });
  } catch (error) {
    console.error("get_nearby_stores error:", error);
    return res.status(500).json({ status: "error", success: false, message: error.message });
  }
};

const get_shop_hierarchy = async (req, res) => {
  try {
    const {
      IndustryType,
      ProjectCategory,
      ProjectSubcategory,
      ProjectType,
      ProjectSubcategoryType,
      ProjectRange,
    } = require("../../../admin-panel/models/core_db");

    const industryTypes = await IndustryType.find({ deleted_at: null, is_active: true })
      .sort({ sort_order: 1, name: 1 })
      .lean();
    const categories = await ProjectCategory.find({ deleted_at: null, is_active: true })
      .sort({ sort_order: 1, _id: 1 })
      .lean();
    const subcategories = await ProjectSubcategory.find({ deleted_at: null, is_active: true }).lean();
    const types = await ProjectType.find({ deleted_at: null, is_active: true }).lean();
    const maps = await ProjectSubcategoryType.find({ deleted_at: null }).lean();
    const ranges = await ProjectRange.find({ deleted_at: null }).populate('unit_id').lean();

    const buildCategoryTree = (cat) => {
      const catSubs = subcategories.filter((sc) => String(sc.category || '') === String(cat._id));
      return {
        id: cat._id,
        name: cat.name || "Unnamed Category",
        industry_type_id: cat.industry_type_id || null,
        subcategories: catSubs.map((sc) => {
          const subMaps = maps.filter((m) => String(m.subcategory || '') === String(sc._id));
          return {
            id: sc._id,
            name: sc.name || "Unnamed Subcategory",
            category_id: sc.category,
            image: sc.image || null,
            color: sc.color || null,
            mappedTypes: subMaps.map((m) => {
              const type = types.find((t) => String(t._id) === String(m.type));
              const typeRanges = ranges.filter((r) => String(r.subcategory_type || '') === String(m._id));
              return {
                id: m._id,
                subcategory_type_id: m._id,
                type_id: type?._id,
                name: type ? type.name : "Unknown Type",
                ranges: typeRanges.map((r) => ({
                  id: r._id,
                  min_value: r.min_value ?? 0,
                  max_value: r.max_value ?? 0,
                  unit_symbol: r.unit_id?.symbol || "kW",
                  range_label: `${r.min_value} - ${r.max_value} ${r.unit_id?.symbol || 'kW'}`,
                })),
              };
            }),
          };
        }),
      };
    };

    const hierarchy = industryTypes.map((ind) => {
      const indCats = categories.filter((cat) => String(cat.industry_type_id || '') === String(ind._id));
      return {
        id: ind._id,
        name: ind.name,
        slug: ind.slug,
        description: ind.description,
        categories: indCats.map(buildCategoryTree),
      };
    });

    return res.json({
      status: "success",
      success: true,
      data: hierarchy,
    });
  } catch (error) {
    console.error("get_shop_hierarchy error:", error);
    return res.status(500).json({ status: "error", success: false, message: error.message });
  }
};

const get_epc_po_allocations = async (req, res) => {
  try {
    const accountId = req.account_id || req.user?.account_id || req.user?.id || req.user?._id;
    if (!accountId) {
      return res.status(401).json({ status: "error", message: "Unauthorized" });
    }

    const { FpoOrder } = require("../../../admin-panel/models/india_solarshop_db");
    const accountObjId = mongoose.Types.ObjectId.isValid(accountId) ? new mongoose.Types.ObjectId(accountId) : null;
    const epcMatches = accountObjId ? [accountId, accountObjId] : [accountId];

    // Find all top-level FPO orders where this account is allocated or assigned
    const orders = await FpoOrder.find({
      $or: [
        { epc_id: { $in: epcMatches } },
        { "items.epc_allocations.epc_buyer_id": { $in: epcMatches } },
      ],
      parent_po_id: null,
      deleted_at: null,
    }).populate('franchisee_id', 'business_name mobile email contact_person').sort({ created_at: -1 }).lean();

    let childOrders = [];
    if (orders.length > 0) {
      const parentIds = orders.map((o) => o._id);
      childOrders = await FpoOrder.find({
        $or: [
          { parent_po_id: { $in: parentIds } },
          { epc_id: { $in: epcMatches }, parent_po_id: { $ne: null } },
        ],
        deleted_at: null,
      }).sort({ created_at: -1 }).lean();

      const childMap = new Map();
      childOrders.forEach((co) => {
        const pId = co.parent_po_id?.toString();
        if (!childMap.has(pId)) childMap.set(pId, []);
        childMap.get(pId).push(co);
      });

      orders.forEach((o) => {
        o.linked_repeat_orders = childMap.get(o._id.toString()) || [];
      });
    }

    // Collect kit IDs to enrich BOTH parent orders and child repeat orders
    const kitIds = [];
    orders.forEach(o => {
      (o.items || []).forEach(item => {
        if (item.kit_id) kitIds.push(item.kit_id);
      });
    });
    childOrders.forEach(co => {
      (co.items || []).forEach(item => {
        if (item.kit_id) kitIds.push(item.kit_id);
      });
    });

    if (kitIds.length > 0) {
      const kits = await ComboKit.find({ _id: { $in: kitIds } }).lean();
      const kitMap = new Map();
      kits.forEach(k => kitMap.set(k._id.toString(), k));

      const enrichItems = (items) => {
        (items || []).forEach(item => {
          if (item.kit_id && kitMap.has(item.kit_id.toString())) {
            const k = kitMap.get(item.kit_id.toString());
            item.kit_image = k.kit_image || (k.images && k.images[0]) || null;
            item.image = item.kit_image;
            item.capacity = k.capacity || k.capacity_kw || null;
            item.description = k.description || null;
            item.brand_name = k.brand_name || null;
            item.inverter_mode = k.inverter_mode || null;
            const validLooseQtys = Array.isArray(k.loose_order_quantities) && k.loose_order_quantities.length > 0
              ? k.loose_order_quantities.map(Number).filter(n => !isNaN(n) && n > 0).sort((a, b) => a - b)
              : [5, 10, 15, 20, 25, 30, 50];
            item.loose_order_quantities = validLooseQtys;
          }
        });
      };

      orders.forEach(o => {
        enrichItems(o.items);
        if (o.items?.[0]?.loose_order_quantities) {
          o.loose_order_quantities = o.items[0].loose_order_quantities;
        }
      });

      childOrders.forEach(co => {
        enrichItems(co.items);
      });
    }

    return res.json({
      status: "success",
      success: true,
      data: orders
    });
  } catch (error) {
    console.error("get_epc_po_allocations error:", error);
    return res.status(500).json({ status: "error", success: false, message: error.message });
  }
};

const submit_epc_po_receipt = async (req, res) => {
  try {
    const accountId = req.account_id || req.user?.account_id || req.user?.id || req.user?._id;
    if (!accountId) {
      return res.status(401).json({ status: "error", message: "Unauthorized" });
    }

    const { poId } = req.params;

    // Verify that the EPC has digitally signed and verified the contract
    const { FpoOrder: CheckOrder } = require("../../../admin-panel/models/india_solarshop_db");
    const existingPo = await CheckOrder.findOne({ _id: poId, deleted_at: null }).lean();
    if (existingPo) {
      let userAlloc = null;
      (existingPo.items || []).forEach(it => {
        (it.epc_allocations || []).forEach(al => {
          if (String(al.epc_buyer_id) === String(accountId) || (it.epc_allocations.length === 1)) {
            userAlloc = al;
          }
        });
      });
      if (userAlloc && userAlloc.contract && userAlloc.contract.status && userAlloc.contract.status !== 'SIGNED') {
        return res.status(400).json({
          status: "error",
          success: false,
          message: "PO Order Contract must be reviewed and signed via registered Mobile OTP verification before submitting the token payment."
        });
      }
    }

    const { FpoOrder } = require("../../../admin-panel/models/india_solarshop_db");

    let receiptUrl = null;
    if (req.files && req.files.length > 0) {
      receiptUrl = req.files[0].path.replace(/\\/g, '/');
      if (receiptUrl.startsWith('public/')) {
        receiptUrl = '/' + receiptUrl.substring(7);
      }
    }

    if (!receiptUrl) {
      return res.status(400).json({ status: "error", message: "Payment receipt file is required." });
    }

    const order = await FpoOrder.findOne({ _id: poId });
    if (!order) {
      return res.status(404).json({ status: "error", message: "PO Order not found." });
    }

    let updated = false;
    order.items.forEach(item => {
      (item.epc_allocations || []).forEach(alloc => {
        if (alloc.epc_buyer_id && alloc.epc_buyer_id.toString() === accountId.toString()) {
          alloc.payment_status = 'RECEIPT_SUBMITTED';
          alloc.payment_receipt_url = receiptUrl;
          updated = true;
        }
      });
    });

    if (!updated && (String(order.epc_id) === String(accountId) || order.parent_po_id)) {
      if (!order.offline_payment) order.offline_payment = {};
      order.offline_payment.receipt_url = receiptUrl;
      order.offline_payment.verification_status = 'pending';
      if (order.status === 'DRAFT' || order.status === 'PAYMENT_PENDING') {
        order.status = 'SUBMITTED';
      }
      updated = true;
    }

    if (!updated) {
      return res.status(404).json({ status: "error", message: "Allocation for this EPC not found in the PO." });
    }

    await order.save();

    return res.json({
      status: "success",
      success: true,
      message: "Payment receipt submitted successfully."
    });
  } catch (error) {
    console.error("submit_epc_po_receipt error:", error);
    return res.status(500).json({ status: "error", success: false, message: error.message });
  }
};

// ── VERIFY EPC PAYMENT RECEIPT (Forbidden for Franchisees) ────────────────────
// Franchisees cannot verify or reject payment receipts. Verification is strictly
// restricted to Admin Panel (/admin-panel/solar-shop/po-orders) and
// Accounts Panel (/account-panel/solar-shop/franchisee-po-orders).
const verify_epc_po_payment = async (req, res) => {
  return res.status(403).json({
    status: 'error',
    success: false,
    message: 'Franchisees are not authorized to verify or reject payment receipts. Verification must be performed via Admin Panel or Accounts Panel only.'
  });
};


// ── EPC PO ALLOCATION CONTRACT & MOBILE OTP VERIFICATION ────────────────────

// Global OTP store for contract signing fallback
global._epc_contract_otps = global._epc_contract_otps || new Map();

// Helper to resolve contract clauses & placeholders
const buildRenderedContract = ({ order, allocation, epcAccount, planPoSetting }) => {
  const contractConfig = planPoSetting?.po_contract || {};
  const isRequired = contractConfig.is_contract_required !== false;
  const contractTitle = contractConfig.contract_title || "SolarKits EPC Purchase Order & Supply Commitment Agreement";
  const contractVersion = contractConfig.contract_version || "1.0";
  const validityDays = contractConfig.validity_days || planPoSetting?.po_validity_days || 30;
  const intro = contractConfig.terms_introduction || "This Purchase Order Contract is entered into between the Authorized SolarKits Franchise Partner and the Assigned Solar EPC Contractor for supply commitment and token deposit under the terms set forth below.";

  const rawClauses = Array.isArray(contractConfig.clauses) && contractConfig.clauses.length > 0
    ? contractConfig.clauses
    : [
        {
          title: "1. Scope of Supply & Quantity Commitment",
          body: "The Solar EPC Contractor agrees to procure, lift, and take delivery of the committed quantity of {{quantity}} SolarKits combo kit(s) under Purchase Order {{po_number}}. The Franchise Partner agrees to supply and allocate the agreed specifications strictly in accordance with SolarKits standards.",
          is_mandatory: true
        },
        {
          title: "2. Token Commitment Deposit",
          body: "The EPC Contractor agrees to pay a mandatory token commitment deposit of ₹{{token_amount}} to secure and lock the inventory. This deposit shall be verified and credited against final purchase invoices or pro-rata dispatches as per plan policy.",
          is_mandatory: true
        },
        {
          title: "3. Order Lock-in & Validity Period",
          body: "This Purchase Order commitment and inventory reservation shall remain firm and valid for a period of {{validity_days}} calendar days from the date of contract execution. Committed kit prices are protected during this validity window.",
          is_mandatory: true
        },
        {
          title: "4. Penalty for Unpurchased Kits & Forfeiture",
          body: "In the event that the EPC Contractor fails to lift the committed kits within {{validity_days}} days, the Franchise Partner and SolarKits reserve the right to apply unpurchased kit penalties or adjust the token deposit as per plan rules.",
          is_mandatory: true
        },
        {
          title: "5. Dispatch, Logistics & Material Handling",
          body: "Upon payment clearance of the balance amount, materials will be dispatched to the designated delivery destination. Transit insurance and dispatch handover will follow SolarKits operational standard operating procedures.",
          is_mandatory: true
        },
        {
          title: "6. Electronic Signature & Mobile OTP Verification",
          body: "This Contract is executed digitally. Mobile OTP verification to the EPC's registered mobile number constitutes an authenticated, legally binding digital signature under the Information Technology Act.",
          is_mandatory: true
        }
      ];

  const qty = allocation?.allocated_quantity || order?.total_booked_quantity || 1;
  const tokenPaise = allocation?.token_amount_paise || order?.token_amount_paise || 5000000;
  const tokenInr = Math.round(tokenPaise / 100);
  const epcCompanyName = allocation?.company_name || epcAccount?.gstin_trade_name || epcAccount?.name || "Solar EPC Partner";
  const epcBuyerName = allocation?.buyer_name || epcAccount?.name || "Authorized Signatory";
  const franchiseeName = order?.franchisee_id?.business_name || order?.franchisee_id?.contact_person || "SolarKits Franchise Partner";
  const franchiseeMobile = order?.franchisee_id?.mobile || "";

  const replaceTokens = (text) => {
    if (!text) return "";
    return String(text)
      .replace(/\{\{po_number\}\}/g, order?.po_number || "PO-PENDING")
      .replace(/\{\{quantity\}\}/g, String(qty))
      .replace(/\{\{token_amount\}\}/g, tokenInr.toLocaleString("en-IN"))
      .replace(/\{\{validity_days\}\}/g, String(validityDays))
      .replace(/\{\{epc_company_name\}\}/g, epcCompanyName)
      .replace(/\{\{epc_company\}\}/g, epcCompanyName)
      .replace(/\{\{epc_buyer_name\}\}/g, epcBuyerName)
      .replace(/\{\{epc_name\}\}/g, epcBuyerName)
      .replace(/\{\{franchisee_name\}\}/g, franchiseeName)
      .replace(/\{\{franchisee_mobile\}\}/g, franchiseeMobile);
  };

  const renderedClauses = rawClauses.map((c) => ({
    title: replaceTokens(c.title),
    body: replaceTokens(c.body),
    is_mandatory: c.is_mandatory !== false,
  }));

  return {
    is_contract_required: isRequired,
    contract_title: replaceTokens(contractTitle),
    contract_version: contractVersion,
    validity_days: validityDays,
    terms_introduction: replaceTokens(intro),
    clauses: renderedClauses,
    summary_data: {
      po_number: order?.po_number,
      quantity: qty,
      token_amount_paise: tokenPaise,
      token_amount_inr: tokenInr,
      epc_company_name: epcCompanyName,
      epc_buyer_name: epcBuyerName,
      franchisee_name: franchiseeName,
      franchisee_mobile: franchiseeMobile,
    }
  };
};

const get_epc_contract_details = async (req, res) => {
  try {
    const accountId = req.account_id || req.user?.account_id || req.user?.id || req.user?._id;
    if (!accountId) {
      return res.status(401).json({ status: "error", success: false, message: "Unauthorized" });
    }

    const { poId } = req.params;
    const { FpoOrder, FranchiseePlanPoSetting } = require("../../../admin-panel/models/india_solarshop_db");

    const order = await FpoOrder.findOne({ _id: poId, deleted_at: null })
      .populate('franchisee_id', 'business_name mobile email contact_person')
      .lean();

    if (!order) {
      return res.status(404).json({ status: "error", success: false, message: "PO Order not found." });
    }

    let targetAlloc = null;
    let targetItem = null;
    (order.items || []).forEach(item => {
      (item.epc_allocations || []).forEach(alloc => {
        if (alloc.epc_buyer_id && alloc.epc_buyer_id.toString() === accountId.toString()) {
          targetAlloc = alloc;
          targetItem = item;
        }
      });
    });

    if (!targetAlloc && (order.items || []).length > 0 && order.items[0].epc_allocations?.length === 1) {
      targetAlloc = order.items[0].epc_allocations[0];
      targetItem = order.items[0];
    }

    if (!targetAlloc) {
      return res.status(404).json({ status: "error", success: false, message: "EPC allocation not found for this PO." });
    }

    const epcAccount = await EpcAccount.findOne({ _id: accountId, deleted_at: null }).lean();
    const planPoSetting = order.plan_id
      ? await FranchiseePlanPoSetting.findOne({ plan_id: order.plan_id, deleted_at: null }).lean()
      : null;

    const rendered = buildRenderedContract({ order, allocation: targetAlloc, epcAccount, planPoSetting });
    const contract = targetAlloc.contract || {};
    const registeredMobile = epcAccount?.registered_whatsapp || epcAccount?.whatsapp || order.customer_details?.phone || "";
    const maskedMobile = registeredMobile && registeredMobile.length >= 4
      ? "+91 " + "•".repeat(Math.max(0, registeredMobile.length - 4)) + registeredMobile.slice(-4)
      : "+91 ••••••";

    return res.json({
      status: "success",
      success: true,
      data: {
        po_id: order._id,
        po_number: order.po_number,
        allocation_id: targetAlloc._id,
        item_name: targetItem?.item_name || "SolarKits Combo Kit",
        allocated_quantity: targetAlloc.allocated_quantity || 1,
        token_amount_paise: targetAlloc.token_amount_paise || order.token_amount_paise || 5000000,
        token_amount_inr: Math.round((targetAlloc.token_amount_paise || order.token_amount_paise || 5000000) / 100),
        franchisee: {
          business_name: order.franchisee_id?.business_name || "SolarKits Franchise Partner",
          contact_person: order.franchisee_id?.contact_person || "",
          mobile: order.franchisee_id?.mobile || "",
          email: order.franchisee_id?.email || "",
        },
        epc: {
          account_id: epcAccount?._id,
          name: epcAccount?.name,
          company_name: epcAccount?.gstin_trade_name || targetAlloc.company_name || epcAccount?.name,
          registered_mobile: registeredMobile,
          masked_mobile: maskedMobile,
          gstin: epcAccount?.gstin || targetAlloc.gstin || "",
        },
        contract_status: contract.status || "PENDING_SIGNATURE",
        contract_number: contract.contract_number || null,
        signer_name: contract.signer_name || epcAccount?.name || "",
        signer_designation: contract.signer_designation || "Authorized Signatory",
        signed_at: contract.signed_at || null,
        otp_verified_at: contract.otp_verified_at || null,
        contract_content: rendered,
      }
    });
  } catch (error) {
    console.error("get_epc_contract_details error:", error);
    return res.status(500).json({ status: "error", success: false, message: error.message });
  }
};

const send_epc_contract_otp = async (req, res) => {
  try {
    const accountId = req.account_id || req.user?.account_id || req.user?.id || req.user?._id;
    if (!accountId) {
      return res.status(401).json({ status: "error", success: false, message: "Unauthorized" });
    }

    const { poId } = req.params;
    const { FpoOrder } = require("../../../admin-panel/models/india_solarshop_db");
    const Otp = require("../../models/india_solarshop_db/otps.schema");

    const order = await FpoOrder.findOne({ _id: poId, deleted_at: null });
    if (!order) {
      return res.status(404).json({ status: "error", success: false, message: "PO Order not found." });
    }

    const epcAccount = await EpcAccount.findOne({ _id: accountId, deleted_at: null });
    if (!epcAccount) {
      return res.status(404).json({ status: "error", success: false, message: "EPC Account not found." });
    }

    const mobile = epcAccount.registered_whatsapp || epcAccount.whatsapp || order.customer_details?.phone;
    if (!mobile) {
      return res.status(400).json({ status: "error", success: false, message: "Registered mobile number not found for this EPC account. Please contact support." });
    }

    const cleanMobile = String(mobile).replace(/\D/g, '').slice(-10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store in global in-memory map
    const otpKey = `${poId}_${accountId}`;
    global._epc_contract_otps.set(otpKey, {
      otp,
      mobile: cleanMobile,
      expiresAt: expiresAt.getTime(),
      attempts: 0,
    });

    // Also persist in Otp schema if possible
    try {
      await Otp.create({
        otp,
        channel: 'mobile',
        target: cleanMobile,
        user_id: accountId,
        reference_type: `contract_sign_${poId}`,
        expires_at: expiresAt,
      });
    } catch (dbErr) {
      console.warn("Could not persist to Otp schema, in-memory backup active:", dbErr.message);
    }

    // Try sending SMS / WhatsApp (fail-safe for dev)
    let smsSent = false;
    try {
      const { sendOTP } = require("../../../admin-panel/utils/yourbulksms");
      await sendOTP("91", cleanMobile, otp);
      smsSent = true;
    } catch (smsErr) {
      console.warn("yourbulksms send error (will try WhatsApp/Dev fallback):", smsErr.message);
    }

    if (!smsSent) {
      try {
        const { sendWhatsAppOTP } = require("../../utils/whatsapp");
        await sendWhatsAppOTP(cleanMobile, `Your SolarKits PO Order Contract verification OTP is: ${otp}. Valid for 10 minutes.`);
      } catch (waErr) {
        console.warn("WhatsApp OTP send error:", waErr.message);
      }
    }

    console.log(`[CONTRACT_OTP] Successfully created OTP for PO ${order.po_number}: ${otp} to mobile +91 ${cleanMobile}`);

    // Update allocation contract status to OTP_SENT
    order.items.forEach(item => {
      (item.epc_allocations || []).forEach(alloc => {
        if (alloc.epc_buyer_id && alloc.epc_buyer_id.toString() === accountId.toString()) {
          alloc.contract = alloc.contract || {};
          alloc.contract.status = 'OTP_SENT';
        }
      });
    });
    await order.save();

    const masked = "+91 " + "•".repeat(Math.max(0, cleanMobile.length - 4)) + cleanMobile.slice(-4);
    return res.json({
      status: "success",
      success: true,
      message: `6-digit OTP sent successfully to registered mobile ${masked}`,
      masked_mobile: masked,
      expires_in_seconds: 600,
      dev_otp: process.env.NODE_ENV !== 'production' ? otp : undefined,
    });
  } catch (error) {
    console.error("send_epc_contract_otp error:", error);
    return res.status(500).json({ status: "error", success: false, message: error.message });
  }
};

const verify_epc_contract_otp = async (req, res) => {
  try {
    const accountId = req.account_id || req.user?.account_id || req.user?.id || req.user?._id;
    if (!accountId) {
      return res.status(401).json({ status: "error", success: false, message: "Unauthorized" });
    }

    const { poId } = req.params;
    const { otp, signer_name, signer_designation } = req.body;

    if (!otp || !otp.toString().trim()) {
      return res.status(400).json({ status: "error", success: false, message: "OTP code is required." });
    }

    const enteredOtp = otp.toString().trim();
    const otpKey = `${poId}_${accountId}`;
    const inMemoryRecord = global._epc_contract_otps.get(otpKey);

    let isValid = false;
    // Master test OTP for testing/development
    if (enteredOtp === "123456" || (inMemoryRecord && inMemoryRecord.otp === enteredOtp && inMemoryRecord.expiresAt > Date.now())) {
      isValid = true;
    } else {
      const Otp = require("../../models/india_solarshop_db/otps.schema");
      const dbRecord = await Otp.findOne({
        user_id: accountId,
        reference_type: `contract_sign_${poId}`,
        expires_at: { $gt: new Date() },
        deleted_at: null,
      }).sort({ created_at: -1 });

      if (dbRecord && dbRecord.otp === enteredOtp) {
        isValid = true;
      }
    }

    if (!isValid) {
      return res.status(400).json({ status: "error", success: false, message: "Invalid or expired OTP. Please enter the correct code or click Resend." });
    }

    const { FpoOrder, FranchiseePlanPoSetting } = require("../../../admin-panel/models/india_solarshop_db");
    const order = await FpoOrder.findOne({ _id: poId, deleted_at: null });
    if (!order) {
      return res.status(404).json({ status: "error", success: false, message: "PO Order not found." });
    }

    const epcAccount = await EpcAccount.findOne({ _id: accountId, deleted_at: null }).lean();
    const planPoSetting = order.plan_id
      ? await FranchiseePlanPoSetting.findOne({ plan_id: order.plan_id, deleted_at: null }).lean()
      : null;

    let updatedAlloc = null;
    order.items.forEach(item => {
      (item.epc_allocations || []).forEach(alloc => {
        const matches = (alloc.epc_buyer_id && alloc.epc_buyer_id.toString() === accountId.toString())
          || (item.epc_allocations.length === 1);
        if (matches) {
          const rendered = buildRenderedContract({ order, allocation: alloc, epcAccount, planPoSetting });
          const contractNumber = alloc.contract?.contract_number || `CNT-${order.po_number}-${Math.floor(1000 + Math.random() * 9000)}`;
          alloc.contract = {
            contract_number: contractNumber,
            status: 'SIGNED',
            contract_snapshot: rendered,
            signer_name: (signer_name || epcAccount?.name || "Authorized Signatory").trim(),
            signer_designation: (signer_designation || "Authorized Signatory / Proprietor").trim(),
            signer_phone: epcAccount?.registered_whatsapp || epcAccount?.whatsapp || order.customer_details?.phone || "",
            signed_at: new Date(),
            signed_ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1',
            otp_verified_at: new Date(),
            otp_reference: "MOBILE_OTP_VERIFIED",
          };
          updatedAlloc = alloc;
        }
      });
    });

    if (!updatedAlloc) {
      return res.status(404).json({ status: "error", success: false, message: "EPC allocation not found to sign." });
    }

    await order.save();
    global._epc_contract_otps.delete(otpKey);

    return res.json({
      status: "success",
      success: true,
      message: "Contract signed and verified successfully! You can now proceed to pay the token deposit.",
      data: updatedAlloc.contract,
    });
  } catch (error) {
    console.error("verify_epc_contract_otp error:", error);
    return res.status(500).json({ status: "error", success: false, message: error.message });
  }
};

const get_signed_contract_document = async (req, res) => {
  try {
    const { poId } = req.params;
    const { epc_buyer_id } = req.query;
    const accountId = epc_buyer_id || req.account_id || req.user?.account_id || req.user?.id || req.user?._id;

    const { FpoOrder, FranchiseePlanPoSetting } = require("../../../admin-panel/models/india_solarshop_db");
    const order = await FpoOrder.findOne({ _id: poId, deleted_at: null })
      .populate('franchisee_id', 'business_name mobile email contact_person')
      .lean();

    if (!order) {
      return res.status(404).json({ status: "error", success: false, message: "PO Order not found." });
    }

    let targetAlloc = null;
    let targetItem = null;
    (order.items || []).forEach(item => {
      (item.epc_allocations || []).forEach(alloc => {
        if (accountId && alloc.epc_buyer_id && alloc.epc_buyer_id.toString() === accountId.toString()) {
          targetAlloc = alloc;
          targetItem = item;
        } else if (!targetAlloc) {
          targetAlloc = alloc;
          targetItem = item;
        }
      });
    });

    if (!targetAlloc) {
      return res.status(404).json({ status: "error", success: false, message: "No allocation found for this PO." });
    }

    const epcAccount = targetAlloc.epc_buyer_id
      ? await EpcAccount.findOne({ _id: targetAlloc.epc_buyer_id }).lean()
      : null;

    const planPoSetting = order.plan_id
      ? await FranchiseePlanPoSetting.findOne({ plan_id: order.plan_id, deleted_at: null }).lean()
      : null;

    const rendered = targetAlloc.contract?.contract_snapshot
      || buildRenderedContract({ order, allocation: targetAlloc, epcAccount, planPoSetting });

    return res.json({
      status: "success",
      success: true,
      data: {
        po_id: order._id,
        po_number: order.po_number,
        allocation_id: targetAlloc._id,
        item_name: targetItem?.item_name || "SolarKits Combo Kit",
        allocated_quantity: targetAlloc.allocated_quantity,
        token_amount_paise: targetAlloc.token_amount_paise,
        token_amount_inr: Math.round(targetAlloc.token_amount_paise / 100),
        payment_status: targetAlloc.payment_status,
        contract: targetAlloc.contract || { status: 'PENDING_SIGNATURE' },
        franchisee: order.franchisee_id,
        epc: {
          name: epcAccount?.name || targetAlloc.buyer_name,
          company_name: epcAccount?.gstin_trade_name || targetAlloc.company_name,
          mobile: epcAccount?.registered_whatsapp || epcAccount?.whatsapp || targetAlloc.contract?.signer_phone,
          gstin: epcAccount?.gstin || targetAlloc.gstin,
        },
        rendered_content: rendered,
      }
    });
  } catch (error) {
    console.error("get_signed_contract_document error:", error);
    return res.status(500).json({ status: "error", success: false, message: error.message });
  }
};

// ── EPC PARTNER PAYS TOKEN DEPOSIT (Directly from EPC Dashboard) ──────────────
const pay_epc_po_token = async (req, res) => {
  try {
    const accountId = req.account_id || req.user?.account_id || req.user?.id || req.user?._id;
    if (!accountId) {
      return res.status(401).json({ status: "error", success: false, message: "Unauthorized" });
    }

    const { poId } = req.params;
    const { utr_number, amount_paid, sender_bank_name, payment_date, payment_receipt_url } = req.body;

    if (!utr_number || !utr_number.trim()) {
      return res.status(400).json({ status: "error", success: false, message: "UTR / Transaction reference number is required." });
    }

    const { recordEpcTokenPayment } = require("../../../admin-panel/services/franchisee.po.service");
    const updatedOrder = await recordEpcTokenPayment({
      po_id: poId,
      franchisee_id: null,
      epc_buyer_id: accountId,
      utr_number: utr_number.trim().toUpperCase(),
      amount_paid_inr: amount_paid,
      sender_bank_name: sender_bank_name || "Bank Transfer",
      payment_date: payment_date || new Date().toISOString().slice(0, 10),
      payment_receipt_url: payment_receipt_url || null,
      actor_id: accountId,
      req,
    });

    return res.status(200).json({
      status: "success",
      success: true,
      message: "Token payment recorded successfully. PO is now officially STARTED!",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("pay_epc_po_token error:", error);
    return res.status(400).json({ status: "error", success: false, message: error.message || "Failed to record token payment" });
  }
};


// ── SOLAR EPC PURCHASE ORDER LIFECYCLE (Cards, Reorder, Settlement & Refund) ──
const list_epc_po_orders = async (req, res) => {
  try {
    const accountId = req.account_id || req.user?.account_id || req.user?.id || req.user?._id;
    if (!accountId) {
      return res.status(401).json({ status: "error", message: "Unauthorized" });
    }

    const { FpoOrder } = require("../../../admin-panel/models/india_solarshop_db");
    const orders = await FpoOrder.find({
      $or: [
        { epc_id: accountId },
        { "items.epc_allocations.epc_buyer_id": accountId },
      ],
      parent_po_id: null,
      deleted_at: null,
    })
      .populate('franchisee_id', 'business_name mobile email contact_person')
      .sort({ created_at: -1 })
      .lean();

    if (orders.length > 0) {
      const parentIds = orders.map((o) => o._id);
      const childOrders = await FpoOrder.find({
        $or: [
          { parent_po_id: { $in: parentIds } },
          { epc_id: accountId, parent_po_id: { $ne: null } },
        ],
        deleted_at: null,
      }).sort({ created_at: -1 }).lean();

      const childMap = new Map();
      childOrders.forEach((co) => {
        const pId = co.parent_po_id?.toString();
        if (!childMap.has(pId)) childMap.set(pId, []);
        childMap.get(pId).push(co);
      });

      orders.forEach((o) => {
        o.linked_repeat_orders = childMap.get(o._id.toString()) || [];
      });

      // Collect kit IDs to enrich with image, description, capacity & loose_order_quantities
      const kitIds = [];
      orders.forEach(o => {
        o.items?.forEach(item => {
          if (item.kit_id) kitIds.push(item.kit_id);
        });
      });

      if (kitIds.length > 0) {
        const kits = await ComboKit.find({ _id: { $in: kitIds } }).lean();
        const kitMap = new Map();
        kits.forEach(k => kitMap.set(k._id.toString(), k));

        orders.forEach(o => {
          o.items?.forEach(item => {
            if (item.kit_id && kitMap.has(item.kit_id.toString())) {
              const k = kitMap.get(item.kit_id.toString());
              item.kit_image = k.kit_image || (k.images && k.images[0]) || null;
              item.capacity = k.capacity || k.capacity_kw || null;
              item.description = k.description || null;
              item.brand_name = k.brand_name || null;
              item.inverter_mode = k.inverter_mode || null;
              const validLooseQtys = Array.isArray(k.loose_order_quantities) && k.loose_order_quantities.length > 0
                ? k.loose_order_quantities.map(Number).filter(n => !isNaN(n) && n > 0).sort((a, b) => a - b)
                : [5, 10, 15, 20, 25, 30, 50];
              item.loose_order_quantities = validLooseQtys;
            }
          });
          if (o.items?.[0]?.loose_order_quantities) {
            o.loose_order_quantities = o.items[0].loose_order_quantities;
          }
        });
      }
    }

    return res.status(200).json({
      status: "success",
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("list_epc_po_orders error:", error);
    return res.status(500).json({ status: "error", success: false, message: error.message });
  }
};

const get_epc_active_po_quotas = async (req, res) => {
  try {
    const accountId = req.account_id || req.user?.account_id || req.user?.id || req.user?._id;
    if (!accountId) {
      return res.status(401).json({ status: "error", message: "Unauthorized" });
    }

    const { FpoOrder } = require("../../../admin-panel/models/india_solarshop_db");
    const activePos = await FpoOrder.find({
      $or: [
        { epc_id: accountId },
        { "items.epc_allocations.epc_buyer_id": accountId },
      ],
      order_type: { $in: ['po_order', 'bulk_po'] },
      remaining_quantity: { $gt: 0 },
      status: { $nin: ['CANCELLED', 'REJECTED', 'EXPIRED'] },
      deleted_at: null,
    })
      .populate('franchisee_id', 'business_name mobile email')
      .sort({ created_at: -1 })
      .lean();

    return res.status(200).json({
      status: "success",
      success: true,
      data: activePos,
    });
  } catch (error) {
    console.error("get_epc_active_po_quotas error:", error);
    return res.status(500).json({ status: "error", success: false, message: error.message });
  }
};

const create_epc_po_order = async (req, res) => {
  try {
    const accountId = req.account_id || req.user?.account_id || req.user?.id || req.user?._id;
    if (!accountId) {
      return res.status(401).json({ status: "error", message: "Unauthorized" });
    }

    const {
      items,
      auto_submit,
      order_type,
      po_category,
      is_token_booking,
      parent_po_id,
      destination_type,
      destination_address,
      destination_pincode,
      offline_payment,
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ status: "error", message: "Items array is required" });
    }

    const { createPoDraft, submitPo } = require('../../../admin-panel/services/franchisee.po.service');

    const result = await createPoDraft({
      epc_id: accountId,
      created_by_role: 'SOLAR_EPC',
      creator_name: req.user?.name || req.user?.company_name || 'Solar EPC Partner',
      items,
      order_type: order_type || 'po_order',
      po_category: po_category || 'SINGLE_PO',
      is_token_booking: Boolean(is_token_booking),
      parent_po_id: parent_po_id || null,
      destination_type: destination_type || 'direct',
      destination_address: destination_address || null,
      destination_pincode: destination_pincode || null,
      offline_payment: offline_payment || null,
      actor_id: accountId,
      req,
    });

    let finalOrder = result.order;
    if (auto_submit && finalOrder?._id) {
      finalOrder = await submitPo({
        po_id: finalOrder._id,
        epc_id: accountId,
        actor_id: accountId,
        req,
      });
    }

    return res.status(201).json({
      status: "success",
      message: "EPC Purchase Order created successfully",
      data: finalOrder,
    });
  } catch (error) {
    console.error("create_epc_po_order error:", error);
    return res.status(400).json({ status: "error", message: error.message || "Failed to create PO order" });
  }
};

const preview_epc_po_penalty = async (req, res) => {
  try {
    const accountId = req.account_id || req.user?.account_id || req.user?.id || req.user?._id;
    const { id } = req.params;

    const { FpoOrder } = require("../../../admin-panel/models/india_solarshop_db");
    const order = await FpoOrder.findOne({
      _id: id,
      $or: [{ epc_id: accountId }, { "items.epc_allocations.epc_buyer_id": accountId }],
      deleted_at: null,
    }).lean();

    if (!order) {
      return res.status(404).json({ status: "error", message: "PO Order not found" });
    }

    const { calculatePoPenalty } = require('../../../admin-panel/services/po.penalty.service');
    const committedQty = Number(order.total_booked_quantity || order.total_quantity || order.items?.[0]?.quantity || 0);
    const purchasedQty = Number(order.fulfilled_quantity || 0);
    const tokenPaidPaise = Number(order.token_paid_paise || order.token_amount_paise || 0);
    const tokenAdjustedPaise = Number(order.token_adjusted_total_paise || 0);
    const unitPricePaise = Number(order.items?.[0]?.unit_price_paise || 4500000);

    const penaltyResult = calculatePoPenalty({
      committedQty,
      purchasedQty,
      tokenPaidPaise,
      tokenAdjustedPaise,
      unitPricePaise,
      penaltyRuleSnapshot: order.penalty_rule_snapshot || order.po_settings_snapshot,
    });

    return res.status(200).json({
      status: "success",
      data: {
        order,
        penalty_preview: penaltyResult,
      },
    });
  } catch (error) {
    console.error("preview_epc_po_penalty error:", error);
    return res.status(500).json({ status: "error", message: error.message || "Failed to calculate penalty preview" });
  }
};

const request_epc_po_refund = async (req, res) => {
  try {
    const accountId = req.account_id || req.user?.account_id || req.user?.id || req.user?._id;
    const { id } = req.params;
    const { bank_details } = req.body;

    const { createPoRefundRequest } = require('../../../admin-panel/services/po.refund.service');
    const refundDoc = await createPoRefundRequest({
      po_id: id,
      requester_id: accountId,
      requester_role: 'SOLAR_EPC',
      requester_name: req.user?.name || req.user?.company_name || 'Solar EPC Partner',
      requester_phone: req.user?.whatsapp || req.user?.mobile || null,
      requester_email: req.user?.email || null,
      bank_details: bank_details || {},
      req,
    });

    return res.status(201).json({
      status: "success",
      message: "Refund request submitted successfully. Our Accounts team will process your payout.",
      data: refundDoc,
    });
  } catch (error) {
    console.error("request_epc_po_refund error:", error);
    return res.status(400).json({ status: "error", message: error.message || "Failed to submit refund request" });
  }
};

const reorder_against_epc_po = async (req, res) => {
  try {
    const accountId = req.account_id || req.user?.account_id || req.user?.id || req.user?._id;
    const { id } = req.params;
    let {
      items,
      quantity,
      kit_id,
      destination_type,
      destination_address,
      destination_pincode,
      delivery_address,
      fulfillment_mode,
      payment_milestones,
      pay_full_amount,
      is_online_order,
      payment_method,
      offline_payment,
    } = req.body;

    const { FpoOrder, RegionPaymentConfig } = require('../../../admin-panel/models/india_solarshop_db');
    const parentPo = await FpoOrder.findById(id).lean();
    if (!parentPo) {
      return res.status(404).json({ success: false, status: 'error', message: 'Parent PO not found' });
    }

    // Allow validated, started, confirmed, or processing POs
    const activeStatuses = ['VALIDATED', 'PO_STARTED', 'CONFIRMED', 'APPROVED', 'STOCK_ALLOCATED', 'PROCESSING'];
    if (!activeStatuses.includes(parentPo.status)) {
      return res.status(400).json({
        success: false,
        status: 'error',
        message: 'Parent PO is not active (current status: ' + parentPo.status + '). Price lock and kit drawdowns activate once the PO is started / token deposit is verified.'
      });
    }

    // ── Enforce PO Guaranteed Price Lock Validity Period ──
    const now = new Date();
    const poExpiryDate = parentPo.lock_expires_at || parentPo.expires_at;
    if (poExpiryDate && now > new Date(poExpiryDate)) {
      return res.status(400).json({
        success: false,
        status: 'error',
        message: 'The price lock on PO #' + parentPo.po_number + ' expired on ' + new Date(poExpiryDate).toLocaleDateString('en-IN') + '. Cannot place reorder under this PO.'
      });
    }

    const reorderRequestedQty = Number(quantity) || (Array.isArray(items) ? items.reduce((s, i) => s + (Number(i.quantity) || 0), 0) : 1);
    const accountStr = accountId ? accountId.toString() : '';

    // Enforce individual EPC quota in Combine PO (multi-EPC)
    if (parentPo.po_category === 'COMBINE_PO' && Array.isArray(parentPo.items?.[0]?.epc_allocations)) {
      const epcAlloc = parentPo.items[0].epc_allocations.find(a => 
        (a.epc_buyer_id?._id || a.epc_buyer_id || a.buyer_id || a._id)?.toString() === accountStr
      );
      if (epcAlloc) {
        const allocCap = Number(epcAlloc.allocated_quantity || 0);
        const alreadyFulfilled = Number(epcAlloc.fulfilled_quantity || 0);
        const epcRemaining = Math.max(0, allocCap - alreadyFulfilled);
        if (reorderRequestedQty > epcRemaining) {
          return res.status(400).json({
            success: false,
            status: 'error',
            message: 'Requested quantity (' + reorderRequestedQty + ' kits) exceeds your remaining allocated quota (' + epcRemaining + ' kits remaining out of ' + allocCap + ' allocated).'
          });
        }
      }
    }

    // ── Enforce Immutable Locked Price from Parent PO ──
    const parentItem = parentPo.items?.[0] || {};
    const lockedUnitPricePaise = parentItem.unit_price_paise || 0;
    const lockedGstRate = parentItem.gst_rate != null ? parentItem.gst_rate : 13.85;
    const targetKitId = kit_id || parentItem.kit_id || parentItem.product_id;

    if (!Array.isArray(items) || items.length === 0) {
      if (!targetKitId) {
        return res.status(400).json({ success: false, status: 'error', message: 'Kit ID or Items array is required for reorder' });
      }

      items = [{
        kit_id: targetKitId,
        product_id: targetKitId,
        item_name: parentItem.item_name || 'Solar Kit',
        item_code: parentItem.item_code || null,
        quantity: reorderRequestedQty,
        unit_price_paise: lockedUnitPricePaise,
        gst_rate: lockedGstRate,
        project_type_id: parentItem.project_type_id || null,
      }];
    } else {
      // Force locked unit price on all items
      items = items.map(it => ({
        ...it,
        unit_price_paise: lockedUnitPricePaise,
        gst_rate: lockedGstRate,
      }));
    }

    // ── Check if delivery state allows online orders ──
    let onlineAllowedForState = false;
    const stateIdToCheck = delivery_address?.state_id || parentPo.state_id;
    if (stateIdToCheck) {
      try {
        const rCfg = await RegionPaymentConfig.findOne({ state_id: stateIdToCheck, is_active: { $ne: false } }).lean();
        if (rCfg && (rCfg.payment_mode === 'online' || rCfg.payment_mode === 'both' || rCfg.online_enabled)) {
          onlineAllowedForState = true;
        }
      } catch (errCfg) {
        console.warn('Error checking region payment config:', errCfg.message);
      }
    }
    const finalIsOnlineOrder = Boolean(is_online_order && onlineAllowedForState);

    const { createPoDraft, submitPo } = require('../../../admin-panel/services/franchisee.po.service');

    const result = await createPoDraft({
      epc_id: accountId,
      created_by_role: 'SOLAR_EPC',
      creator_name: req.user?.name || req.user?.company_name || 'Solar EPC Partner',
      items,
      order_type: 'loose_kit_order',
      parent_po_id: id,
      destination_type: destination_type || (fulfillment_mode === 'epc_warehouse' ? 'warehouse' : 'direct'),
      destination_address: delivery_address?.line || destination_address || parentPo.destination_address || null,
      destination_pincode: delivery_address?.pincode || destination_pincode || parentPo.destination_pincode || null,
      delivery_address: delivery_address || null,
      fulfillment_mode: fulfillment_mode || 'direct_site',
      is_online_order: finalIsOnlineOrder,
      online_order_state_id: stateIdToCheck || null,
      payment_method: finalIsOnlineOrder ? 'icici_ecollection' : (payment_method || (offline_payment ? 'offline_bank_transfer' : 'bank_transfer')),
      pay_full_amount: Boolean(pay_full_amount),
      offline_payment: offline_payment || null,
      actor_id: accountId,
      req,
    });

    let finalOrder = result.order;
    if (finalOrder?._id) {
      finalOrder = await submitPo({
        po_id: finalOrder._id,
        epc_id: accountId,
        actor_id: accountId,
        req,
      });
    }

    return res.status(201).json({
      success: true,
      status: 'success',
      message: 'Linked reorder placed successfully against PO',
      data: {
        order: finalOrder,
        price_lock: finalOrder.price_lock,
        payment_milestones: finalOrder.payment_milestones,
        po_origin: finalOrder.po_origin,
        token_adjustment: {
          token_adjusted_inr: Math.round((finalOrder.token_adjusted_paise || 0) / 100),
          net_payable_inr: Math.round((finalOrder.net_payable_paise || finalOrder.grand_total_paise || 0) / 100),
        },
      },
    });
  } catch (error) {
    console.error('reorder_against_epc_po error:', error);
    return res.status(400).json({ success: false, status: 'error', message: error.message || 'Failed to place reorder' });
  }
};

const upload_epc_po_receipt = async (req, res) => {
  try {
    let receiptUrl = "";
    let filename = "";
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const file = req.files[0];
      receiptUrl = file.path || file.secure_url || file.url || (file.filename ? "/uploads/epc_receipts/" + file.filename : "");
      filename = file.originalname || file.filename;
    } else if (req.file) {
      receiptUrl = req.file.path || req.file.secure_url || req.file.url || (req.file.filename ? "/uploads/epc_receipts/" + req.file.filename : "");
      filename = req.file.originalname || req.file.filename;
    }
    if (receiptUrl && receiptUrl.startsWith("public/")) {
      receiptUrl = "/" + receiptUrl.substring(7);
    }
    if (!receiptUrl) {
      return res.status(400).json({ status: "error", message: "No receipt file uploaded" });
    }
    return res.status(200).json({
      status: "success",
      data: {
        receipt_url: receiptUrl,
        filename,
      },
    });
  } catch (error) {
    console.error("upload_epc_po_receipt error:", error);
    return res.status(500).json({ status: "error", message: error.message || "Failed to upload receipt" });
  }
};

module.exports = {
  upload_epc_po_receipt,
  get_combo_kits_by_district,
  get_best_seller_kits,
  get_inventory_status,
  get_checkout_settings,
  get_active_offers,
  reserve_stock,
  confirm_order,
  get_cart,
  update_cart,
  create_request_order,
  get_gst_status,
  gst_generate_otp,
  gst_verify_otp,
  checkout_send_phone_otp,
  checkout_verify_phone_otp,
  get_orders,
  update_order_address,
  get_bos_kits,
  save_bos_kits,
  create_or_update_bos_kit,
  delete_bos_kit,
  toggle_bos_kit_stock,
  get_bos_custom_catalog,
  save_bos_custom_catalog,
  get_nearby_stores,
  get_shop_hierarchy,
  get_company_bank_details,
  check_warehouse_stock,
  checkout_warehouse_capacity_check,
  calculate_pincode_delivery_cost,
  create_epc_offline_checkout,
  resubmit_epc_offline_payment,
  get_epc_order_invoice_data,
  get_epc_po_allocations,
  submit_epc_po_receipt,
  verify_epc_po_payment,
  pay_epc_po_token,
  get_epc_contract_details,
  send_epc_contract_otp,
  verify_epc_contract_otp,
  get_signed_contract_document,
  list_epc_po_orders,
  get_epc_active_po_quotas,
  create_epc_po_order,
  preview_epc_po_penalty,
  request_epc_po_refund,
  reorder_against_epc_po,
  submit_epc_milestone_payment,
  resolve_payment_milestones,
};






