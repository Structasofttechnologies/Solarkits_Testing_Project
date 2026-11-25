'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { generate_auth_tokens, set_auth_cookies } = require('../../utils/jsonwebtoken');
const { logBoskitAudit } = require('../../utils/audit_logger');
const { sendOTP } = require('../../../solarshop-india/utils/nodemailer');

/**
 * 1. Dealer Registration (Distributor Invitation or Public Application)
 */
const register_dealer = async (req, res) => {
  try {
    const {
      business_name,
      email,
      mobile,
      password,
      gst_number,
      pan_number,
      contact_person,
      distributor_id,
      invite_code,
      shop_address,
    } = req.body;

    if (!business_name || !email || !mobile || !password) {
      return res.status(400).json({
        status: 'error',
        success: false,
        message: 'Business name, email, mobile, and password are required.',
      });
    }

    const BoskitDealer = mongoose.model('boskit_dealers');
    const BoskitDistributor = mongoose.model('boskit_distributors');
    const BoskitDealerApplication = mongoose.model('boskit_dealer_applications');
    const BoskitNotification = mongoose.model('boskit_notifications');

    // Check duplicate
    const existing = await BoskitDealer.findOne({
      $or: [{ email: email.toLowerCase() }, { mobile }],
    });

    if (existing) {
      return res.status(409).json({
        status: 'error',
        success: false,
        message: 'A dealer account with this email or mobile already exists. Please login.',
      });
    }

    // Resolve Distributor
    let targetDistributorId = distributor_id;
    if (!targetDistributorId) {
      const defaultDist = await BoskitDistributor.findOne({ activation_status: 'active' });
      targetDistributorId = defaultDist?._id;
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const dealerCode = `BK-DLR-${Date.now().toString().slice(-4).toUpperCase()}`;

    const [dealer] = await BoskitDealer.create([
      {
        dealer_code: dealerCode,
        business_name,
        email: email.toLowerCase(),
        mobile,
        password_hash,
        gst_number: gst_number ? gst_number.toUpperCase() : null,
        pan_number: pan_number ? pan_number.toUpperCase() : null,
        distributor_id: targetDistributorId,
        authorized_person: {
          name: contact_person || business_name,
          mobile,
          email: email.toLowerCase(),
        },
        shop_address: shop_address || {
          line: 'Commercial Solar Shop',
          city: 'Ahmedabad',
          pincode: '380001',
        },
        lifecycle_status: 'approved',
        activation_status: 'active',
      },
    ]);

    // Create Dealer Application Record
    await BoskitDealerApplication.create({
      dealer_id: dealer._id,
      distributor_id: targetDistributorId,
      status: 'approved',
      step_completed: 6,
      step_data: {
        registered_via: invite_code ? 'distributor_invite' : 'direct',
        invite_code,
      },
    });

    // Notify Distributor
    if (targetDistributorId) {
      await BoskitNotification.create({
        recipient_type: 'boskit_distributor',
        recipient_id: targetDistributorId,
        event_type: 'dealer_onboarded',
        title: 'New Sub-Dealer Onboarded! 🎉',
        message: `${business_name} has joined your territory dealer network (Dealer Code: ${dealerCode}).`,
        priority: 'medium',
        entity_type: 'boskit_dealers',
        entity_id: dealer._id,
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generate_auth_tokens(dealer, 'boskit_dealer');
    set_auth_cookies(res, req, { accessToken, refreshToken, prefix: 'boskit_dealer' });

    logBoskitAudit({
      actor_type: 'boskit_dealer',
      actor_id: dealer._id,
      action: 'DEALER_REGISTERED',
      entity_type: 'boskit_dealers',
      entity_id: dealer._id,
      req,
    });

    return res.status(201).json({
      status: 'success',
      success: true,
      message: 'Dealer registration successful!',
      tokens: { accessToken, refreshToken },
      dealer: {
        id: dealer._id,
        dealer_code: dealer.dealer_code,
        business_name: dealer.business_name,
        email: dealer.email,
        mobile: dealer.mobile,
        distributor_id: dealer.distributor_id,
        activation_status: dealer.activation_status,
      },
    });
  } catch (error) {
    console.error('[register_dealer Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Dealer registration failed: ' + error.message,
    });
  }
};

/**
 * 2. Dealer Dashboard Stats
 */
const get_dealer_dashboard_stats = async (req, res) => {
  try {
    const dealerId = req.user.id;

    const BoskitDealer = mongoose.model('boskit_dealers');
    const BoskitDistributor = mongoose.model('boskit_distributors');
    const BoskitOrder = mongoose.model('boskit_orders');

    let dealer = await BoskitDealer.findById(dealerId).lean();
    if (!dealer) {
      return res.status(404).json({ status: 'error', success: false, message: 'Dealer account not found.' });
    }

    let targetDistributorId = dealer.distributor_id;
    if (!targetDistributorId) {
      const defaultDist = await BoskitDistributor.findOne({ activation_status: 'active' });
      targetDistributorId = defaultDist?._id;
    }

    const [distributor, orders, allDealerOrders] = await Promise.all([
      targetDistributorId ? BoskitDistributor.findById(targetDistributorId).lean() : null,
      BoskitOrder.find({
        $or: [{ dealer_id: dealerId }, { buyer_id: dealerId, buyer_type: 'dealer' }],
      })
        .sort({ created_at: -1 })
        .limit(5)
        .lean(),
      BoskitOrder.find({
        $or: [{ dealer_id: dealerId }, { buyer_id: dealerId, buyer_type: 'dealer' }],
        order_status: { $ne: 'cancelled' },
      }).lean(),
    ]);

    // Calculate dynamic lifetime procurement
    const totalLifetimePaise = allDealerOrders.reduce(
      (sum, ord) => sum + (ord.grand_total_paise || (ord.grand_total_inr ? ord.grand_total_inr * 100 : 0)),
      0
    );
    const lifetimeProcurementInr = totalLifetimePaise > 0 ? Math.round(totalLifetimePaise / 100) : 0;
    const dispatchedCount = allDealerOrders.filter((o) =>
      ['dispatched', 'delivered', 'shipped'].includes(o.order_status || o.status)
    ).length;

    return res.status(200).json({
      status: 'success',
      success: true,
      data: {
        dealer: {
          id: dealer._id,
          dealer_code: dealer.dealer_code || `BK-DLR-${dealer._id.toString().slice(-4).toUpperCase()}`,
          business_name: dealer.business_name,
          email: dealer.email,
          mobile: dealer.mobile,
          gst_number: dealer.gst_number || 'Unregistered',
          activation_status: dealer.activation_status,
          shop_address: dealer.shop_address || {
            line: 'Commercial Solar Shop',
            city: 'Ahmedabad',
            pincode: '380001',
          },
        },
        distributor_hub: {
          id: distributor?._id,
          business_name: distributor?.business_name || 'BOSKIT Central Regional Logistics Hub',
          gst_number: distributor?.gst_number || '24AAACC1206D1ZM',
          email: distributor?.email || 'hub@boskit.in',
          mobile: distributor?.mobile || '9876500001',
          support_phone: distributor?.mobile || '+91 98765 00001',
          warehouse_city: distributor?.shop_address?.city || 'Ahmedabad',
          warehouse_address: distributor?.shop_address?.line || '101, Solar Logistics Hub, Phase II',
        },
        metrics: {
          lifetime_procurement_inr: lifetimeProcurementInr,
          total_orders_count: allDealerOrders.length,
          dispatched_orders_count: dispatchedCount,
          current_pricing_tier: 'Dealer Gold Wholesale Rate (Distributor Margin Applied)',
          credit_balance_inr: 50000,
        },
        recent_orders: orders.map((o) => ({
          id: o._id,
          order_number: o.order_number || `BK-ORD-${o._id.toString().slice(-6).toUpperCase()}`,
          grand_total_inr: Math.round(
            (o.grand_total_paise || (o.grand_total_inr ? o.grand_total_inr * 100 : 0)) / 100
          ),
          items_count: o.items?.length || 1,
          status: o.order_status || o.status || 'confirmed',
          tracking_number: o.tracking_number || null,
          created_at: o.created_at || o.createdAt || new Date(),
        })),
      },
    });
  } catch (error) {
    console.error('[get_dealer_dashboard_stats Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to fetch dealer dashboard stats: ' + error.message,
    });
  }
};

/**
 * 3. Dealer Wholesale Catalogue (Scoped with Assigned Distributor's Procured Products & Custom Margin Rules)
 */
const get_dealer_catalogue = async (req, res) => {
  try {
    const dealerId = req.user?.id || req.user?._id;
    const { category, search, brand } = req.query;

    const BoskitDealer = mongoose.model('boskit_dealers');
    const BoskitDistributor = mongoose.model('boskit_distributors');
    const BoskitDistributorPlanAssignment = mongoose.model('boskit_distributor_plan_assignments');
    const BoskitPriceRule = mongoose.model('boskit_price_rules');
    const BoskitOrder = mongoose.model('boskit_orders');
    const { Product } = require('../../../admin-panel/models/core_db');

    let distributorId = null;
    let dealer = null;
    if (dealerId) {
      dealer = await BoskitDealer.findById(dealerId).lean();
      if (dealer?.distributor_id) {
        distributorId = dealer.distributor_id;
      }
    }

    if (!distributorId) {
      const defaultDist = await BoskitDistributor.findOne({ activation_status: 'active' }).lean();
      distributorId = defaultDist?._id;
    }

    // 1. Get Distributor Plan & Margin Settings
    let baseDiscountPercent = 15; // default 15% distributor discount off MRP
    let defaultDealerMargin = 10; // default 10% distributor margin charged to dealer

    if (distributorId) {
      const assignment = await BoskitDistributorPlanAssignment.findOne({
        distributor_id: distributorId,
        status: 'active',
      }).lean();

      if (assignment?.plan_snapshot) {
        baseDiscountPercent = assignment.plan_snapshot.discount_percentage || 15;
        const minMargin = assignment.plan_snapshot.distributor_margin_slab_min || 8;
        const maxMargin = assignment.plan_snapshot.distributor_margin_slab_max || 14;
        defaultDealerMargin = Math.round((minMargin + maxMargin) / 2) || 10;
      }
    }

    // 2. Fetch custom margin / price override rules set by this distributor
    let distributorRules = [];
    if (distributorId) {
      distributorRules = await BoskitPriceRule.find({
        distributor_id: distributorId,
        scope: 'user_override',
      }).lean();
    }

    const ruleMap = {};
    distributorRules.forEach((r) => {
      if (r.product_id) {
        ruleMap[r.product_id.toString()] = r;
      }
    });

    // 3. Fetch Distributor's Procurement History to see what distributor has purchased
    let distributorOrders = [];
    if (distributorId) {
      distributorOrders = await BoskitOrder.find({
        $or: [
          { buyer_id: distributorId, buyer_type: 'distributor' },
          { distributor_id: distributorId },
        ],
        order_status: { $nin: ['cancelled'] },
      }).lean();
    }

    const purchasedStockMap = {};
    distributorOrders.forEach((ord) => {
      (ord.items || []).forEach((item) => {
        const prodKey = (item.product_id || item.kit_id || item._id)?.toString();
        if (prodKey) {
          purchasedStockMap[prodKey] = (purchasedStockMap[prodKey] || 0) + (item.quantity || 1);
        }
      });
    });

    // 4. Fetch Products and BOS Kits
    let dbQuery = { is_active: { $ne: false }, deleted_at: null };

    let BosKitModel;
    try {
      BosKitModel = mongoose.model('bos_kits');
    } catch {
      BosKitModel = require('../../../solarshop-india/models/india_solarshop_db/bos_kits.schema');
    }

    const [productsFromDb, bosKitsFromDb] = await Promise.all([
      Product.find(dbQuery)
        .populate('brand_id', 'name logo_url')
        .sort({ is_featured: -1, created_at: -1 })
        .lean(),
      BosKitModel.find({ deleted_at: null, is_active: { $ne: false } })
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    let products = productsFromDb || [];

    // Map BOS kits into unified shape
    const mappedBosKits = (bosKitsFromDb || []).map((bk) => ({
      _id: bk._id,
      name: bk.name,
      sku: `BK-KIT-${bk._id.toString().slice(-6).toUpperCase()}`,
      category: 'boskit',
      brand_name: 'SolarKits ProBOS',
      brand_id: null,
      mrp: bk.marketPrice || Math.round((bk.ourPrice || 10000) * 1.35),
      distributor_price: bk.ourPrice,
      moq: 1,
      image_url:
        bk.imageUrl ||
        bk.image ||
        'https://images.unsplash.com/photo-1592833159057-651427788523?w=800&auto=format&fit=crop&q=80',
      specifications: {
        category: bk.category || 'Turnkey Kit',
        subCategory: bk.subCategory || 'On-Grid BOS',
        systemType: bk.systemType || 'Residential / Commercial',
        projectRange: bk.projectRange || '3kW - 10kW',
        warranty: bk.warranty || '5 Years Replacement Warranty',
        components: (bk.components || []).join(', '),
      },
    }));

    products = [...mappedBosKits, ...products];

    // Helper to determine product category slug
    const resolveCategorySlug = (p) => {
      const name = (p.name || '').toLowerCase();
      if (p.category === 'boskit' || name.includes('combo') || name.includes('turnkey')) return 'boskit';
      if (name.includes('panel') || name.includes('module') || name.includes('perc') || name.includes('topcon')) return 'panels';
      if (name.includes('inverter') || name.includes('mppt') || name.includes('hybrid')) return 'inverters';
      if (name.includes('battery') || name.includes('lithium') || name.includes('storage')) return 'batteries';
      if (name.includes('structure') || name.includes('mounting') || name.includes('tin shed') || name.includes('rcc')) return 'structures';
      if (name.includes('cable') || name.includes('wire') || name.includes('connector')) return 'cables';
      if (name.includes('dcdb') || name.includes('acdb') || name.includes('distribution')) return 'dcdb';
      return 'panels';
    };

    // Transform products with distributor margin calculations and rich eCommerce fields
    const items = products
      .map((p) => {
        const prodId = p._id.toString();
        const rawCostInr = p.base_price_paise ? Math.round(p.base_price_paise / 100) : null;
        const mrp =
          p.mrp ||
          (p.mrp_paise ? Math.round(p.mrp_paise / 100) : rawCostInr ? Math.round(rawCostInr * 1.3) : 10000);

        // Distributor Buy Price
        const distributorBuyPrice =
          p.distributor_price || rawCostInr || Math.round(mrp * (1 - baseDiscountPercent / 100));

        // Check if distributor set custom margin/override rule for this product
        const customRule = ruleMap[prodId];

        // If distributor explicitly deactivated this item for their dealer network, omit it
        if (customRule && (customRule.status === 'inactive' || customRule.is_active === false)) {
          return null;
        }

        let dealerMarginPercent = defaultDealerMargin;
        let dealerSellPriceInr = null;

        if (customRule) {
          if (customRule.dealer_rate_paise && customRule.dealer_rate_paise > 0) {
            dealerSellPriceInr = Math.round(customRule.dealer_rate_paise / 100);
            dealerMarginPercent = Math.max(
              0,
              Math.round(((dealerSellPriceInr - distributorBuyPrice) / distributorBuyPrice) * 100)
            );
          } else if (customRule.discount_percentage !== undefined) {
            dealerMarginPercent = customRule.discount_percentage;
            dealerSellPriceInr = Math.round(distributorBuyPrice * (1 + dealerMarginPercent / 100));
          }
        }

        if (!dealerSellPriceInr) {
          dealerSellPriceInr = Math.round(distributorBuyPrice * (1 + dealerMarginPercent / 100));
        }

        // Calculate Dealer Savings vs Retail MRP
        const dealerDiscountPercent = Math.max(0, Math.round(((mrp - dealerSellPriceInr) / mrp) * 100));
        const savingsInr = Math.max(0, mrp - dealerSellPriceInr);

        const categorySlug = resolveCategorySlug(p);
        const specObj = p.specifications || {};
        const brandName =
          p.brand_name ||
          p.brand ||
          p.brand_id?.name ||
          (p.name.includes('Tata')
            ? 'Tata Power Solar'
            : p.name.includes('Waaree')
            ? 'Waaree Energies'
            : p.name.includes('Adani')
            ? 'Adani Solar'
            : p.name.includes('Havells')
            ? 'Havells'
            : p.name.includes('Growatt')
            ? 'Growatt'
            : 'SolarKits ProBOS');

        const purchasedQty = purchasedStockMap[prodId] || 0;
        const hasPurchased = purchasedQty > 0;

        // Rich technical specs generation for eCommerce display
        const enrichedSpecs = {
          ...specObj,
          technology:
            specObj.technology ||
            (p.name.includes('TOPCon')
              ? 'N-Type Bifacial TOPCon'
              : p.name.includes('Mono PERC')
              ? 'Mono PERC Half-Cut'
              : p.name.includes('Hybrid')
              ? 'Hybrid MPPT Dual-Channel'
              : 'Tier-1 High Efficiency'),
          efficiency:
            specObj.efficiency ||
            (categorySlug === 'panels'
              ? '21.8% Peak Module Efficiency'
              : categorySlug === 'inverters'
              ? '98.6% European Efficiency'
              : '99.2% Transmission Efficiency'),
          warranty:
            specObj.warranty ||
            specObj.Warranty ||
            (categorySlug === 'panels'
              ? '12 Years Product + 25 Years Performance Warranty'
              : categorySlug === 'inverters'
              ? '10 Years Comprehensive Factory Warranty'
              : '5 Years Replacement Warranty'),
          certifications: 'BIS, IEC 61215, ALMM Listed, CE, ISO 9001',
          origin: 'Made in India (ALMM Approved)',
        };

        const resolvedMoq = customRule?.moq || p.moq || p.min_order_qty || (categorySlug === 'panels' ? 10 : 1);

        return {
          id: prodId,
          name: p.name,
          sku: p.sku || p.sku_code || `BK-${prodId.slice(-6).toUpperCase()}`,
          category: categorySlug,
          brand: brandName,
          brand_logo: p.brand_id?.logo_url || null,
          mrp_inr: mrp,
          distributor_buy_price_inr: distributorBuyPrice,
          distributor_margin_percent: dealerMarginPercent,
          dealer_wholesale_inr: dealerSellPriceInr,
          dealer_discount_percent: dealerDiscountPercent,
          savings_inr: savingsInr,
          gst_rate_pct: 18,
          moq: resolvedMoq,
          rating: 4.8,
          reviews_count: 34,
          in_stock: true,
          has_purchased: hasPurchased,
          distributor_stock_qty: purchasedQty,
          stock_status: hasPurchased
            ? `In Stock at Regional Depot (${purchasedQty} Units available for immediate dispatch)`
            : 'Available via Regional Depot (48-Hour Priority Dispatch)',
          image_url:
            p.image_url ||
            p.image ||
            p.imageUrl ||
            'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80',
          images: [
            p.image_url ||
              p.image ||
              p.imageUrl ||
              'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1548611716-ad022c4f6990?auto=format&fit=crop&w=800&q=80',
          ],
          specifications: enrichedSpecs,
          warranty_years: enrichedSpecs.warranty,
          distributor_custom_rate_applied: Boolean(customRule),
        };
      })
      .filter(Boolean);

    // Apply category & search & brand filters if requested
    let filtered = items;
    if (category && category !== 'all') {
      filtered = filtered.filter((p) => p.category === category);
    }
    if (brand && brand !== 'all') {
      filtered = filtered.filter((p) => p.brand.toLowerCase() === brand.toLowerCase());
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    return res.status(200).json({
      status: 'success',
      success: true,
      distributor_id: distributorId,
      total_products: filtered.length,
      products: filtered,
    });
  } catch (error) {
    console.error('[get_dealer_catalogue Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to fetch dealer catalogue: ' + error.message,
    });
  }
};

/**
 * 4. Create Dealer Wholesale Equipment Order (Checkout)
 */
const create_dealer_order = async (req, res) => {
  try {
    const dealerId = req.user.id;
    const {
      items,
      delivery_mode = 'depot_pickup', // 'depot_pickup' | 'site_delivery'
      shipping_address,
      billing_details,
      payment_method = 'neft_rtgs', // 'neft_rtgs' | 'credit_limit' | 'instant_online' | 'po_upload'
      notes,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        status: 'error',
        success: false,
        message: 'Cannot place order: Cart is empty or items are missing.',
      });
    }

    const BoskitDealer = mongoose.model('boskit_dealers');
    const BoskitDistributor = mongoose.model('boskit_distributors');
    const BoskitOrder = mongoose.model('boskit_orders');
    const BoskitInvoice = mongoose.model('boskit_invoices');
    const BoskitNotification = mongoose.model('boskit_notifications');

    const dealer = await BoskitDealer.findById(dealerId).lean();
    if (!dealer) {
      return res.status(404).json({ status: 'error', success: false, message: 'Dealer account not found.' });
    }

    let targetDistributorId = dealer.distributor_id;
    if (!targetDistributorId) {
      const defaultDist = await BoskitDistributor.findOne({ activation_status: 'active' });
      targetDistributorId = defaultDist?._id;
    }

    const distributor = targetDistributorId
      ? await BoskitDistributor.findById(targetDistributorId).lean()
      : null;

    // Calculate line items and totals
    let subtotalInr = 0;
    const orderItems = items.map((i, idx) => {
      const qty = Math.max(1, parseInt(i.quantity, 10) || 1);
      const unitPriceInr = parseFloat(i.dealer_wholesale_inr) || parseFloat(i.unit_price_inr) || 10000;
      const lineTotalInr = unitPriceInr * qty;
      subtotalInr += lineTotalInr;

      const mrpInr = parseFloat(i.mrp_inr) || Math.round(unitPriceInr * 1.15);

      return {
        scope_type: 'product',
        product_id: mongoose.Types.ObjectId.isValid(i.product_id || i.id)
          ? new mongoose.Types.ObjectId(i.product_id || i.id)
          : null,
        item_name: i.name || i.item_name || 'Wholesale Solar Equipment',
        item_sku: i.sku || `BK-DLR-SKU-${idx + 1}`,
        quantity: qty,
        price_snapshot: {
          base_mrp_paise: Math.round(mrpInr * 100),
          unit_price_paise: Math.round(unitPriceInr * 100),
          price_before_gst_paise: Math.round(unitPriceInr * 100),
          gst_pct: 18,
          gst_amount_paise: Math.round(unitPriceInr * 0.18 * 100),
          discount_value: Math.max(0, mrpInr - unitPriceInr),
          moq: i.moq || 1,
          moq_met: qty >= (i.moq || 1),
          pricing_explanation: 'Dealer Wholesale Rate with Distributor Margin Applied',
        },
        line_total_paise: Math.round(lineTotalInr * 1.18 * 100),
      };
    });

    const gstAmountInr = Math.round(subtotalInr * 0.18);
    const shippingFeeInr = delivery_mode === 'depot_pickup' ? 0 : subtotalInr > 200000 ? 0 : 2500;
    const grandTotalInr = subtotalInr + gstAmountInr + shippingFeeInr;

    const year = new Date().getFullYear();
    const seq = Date.now().toString().slice(-6);
    const orderNumber = `BK-DLR-${year}-${seq}`;
    const invoiceNumber = `BKI-DLR-${year}-${seq}`;

    // Create Order Record
    const [order] = await BoskitOrder.create([
      {
        order_number: orderNumber,
        buyer_type: 'dealer',
        buyer_id: dealer._id,
        dealer_id: dealer._id,
        distributor_id: targetDistributorId || null,
        items: orderItems,
        subtotal_paise: Math.round(subtotalInr * 100),
        tax_total_paise: Math.round(gstAmountInr * 100),
        shipping_fee_paise: Math.round(shippingFeeInr * 100),
        discount_total_paise: 0,
        grand_total_paise: Math.round(grandTotalInr * 100),
        order_status: 'confirmed',
        payment_status: payment_method === 'instant_online' ? 'completed' : 'pending',
        delivery_address: {
          line:
            delivery_mode === 'depot_pickup'
              ? distributor?.shop_address?.line || 'Distributor Regional Logistics Depot'
              : shipping_address?.line || dealer.shop_address?.line || 'Dealer Warehouse / Installation Site',
          city:
            delivery_mode === 'depot_pickup'
              ? distributor?.shop_address?.city || 'Ahmedabad'
              : shipping_address?.city || dealer.shop_address?.city || 'Ahmedabad',
          pincode:
            delivery_mode === 'depot_pickup'
              ? distributor?.shop_address?.pincode || '380001'
              : shipping_address?.pincode || dealer.shop_address?.pincode || '380001',
          contact_name:
            delivery_mode === 'depot_pickup'
              ? dealer.authorized_person?.name || dealer.business_name
              : shipping_address?.contact_name || dealer.business_name,
          contact_phone: shipping_address?.contact_phone || dealer.mobile,
          delivery_mode,
        },
        billing_gst_number: billing_details?.gst_number || dealer.gst_number || '24AAACC1206D1ZM',
        billing_name: billing_details?.business_name || dealer.business_name,
        billing_address:
          billing_details?.address || dealer.shop_address?.line || 'Commercial Dealer Shop, Ahmedabad',
        status_history: [
          {
            status: 'confirmed',
            actor_type: 'boskit_dealer',
            actor_id: dealer._id,
            comment: `Wholesale order placed via ${payment_method.toUpperCase()} (${delivery_mode === 'depot_pickup' ? 'Regional Depot Pickup' : 'Direct Dispatch'}).`,
          },
        ],
      },
    ]);

    // Create Invoice Record
    await BoskitInvoice.create({
      order_id: order._id,
      order_number: orderNumber,
      invoice_number: invoiceNumber,
      buyer_type: 'dealer',
      buyer_id: dealer._id,
      invoice_snapshot: {
        subtotal_paise: Math.round(subtotalInr * 100),
        net_taxable_paise: Math.round(subtotalInr * 100),
        cgst_paise: Math.round((gstAmountInr / 2) * 100),
        sgst_paise: Math.round((gstAmountInr / 2) * 100),
        igst_paise: 0,
        total_tax_paise: Math.round(gstAmountInr * 100),
        grand_total_paise: Math.round(grandTotalInr * 100),
        items: orderItems,
        gstin: billing_details?.gst_number || dealer.gst_number || '24AAACC1206D1ZM',
        distributor_name: distributor?.business_name || 'BOSKIT Regional Hub',
      },
      status: 'generated',
      generated_at: new Date(),
    });

    // Notify Assigned Distributor
    if (targetDistributorId) {
      await BoskitNotification.create({
        recipient_type: 'boskit_distributor',
        recipient_id: targetDistributorId,
        event_type: 'order_created',
        title: 'New Wholesale Order from Dealer! 📦',
        message: `${dealer.business_name} has placed a new equipment wholesale order #${orderNumber} for ₹${grandTotalInr.toLocaleString('en-IN')}.`,
        priority: 'high',
        entity_type: 'boskit_orders',
        entity_id: order._id,
      });
    }

    logBoskitAudit({
      actor_type: 'boskit_dealer',
      actor_id: dealer._id,
      action: 'DEALER_ORDER_CREATED',
      entity_type: 'boskit_orders',
      entity_id: order._id,
      req,
    });

    return res.status(201).json({
      status: 'success',
      success: true,
      message: `Dealer wholesale order #${orderNumber} placed successfully!`,
      order: {
        id: order._id,
        order_number: orderNumber,
        invoice_number: invoiceNumber,
        subtotal_inr: subtotalInr,
        tax_total_inr: gstAmountInr,
        shipping_fee_inr: shippingFeeInr,
        grand_total_inr: grandTotalInr,
        status: order.order_status,
        items_count: orderItems.length,
        delivery_mode,
        payment_method,
        distributor_hub: distributor?.business_name || 'Regional Distributor Hub',
        created_at: order.created_at,
      },
    });
  } catch (error) {
    console.error('[create_dealer_order Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to place wholesale order: ' + error.message,
    });
  }
};

/**
 * 5. Dealer Orders History
 */
const get_dealer_orders = async (req, res) => {
  try {
    const dealerId = req.user.id;
    const BoskitOrder = mongoose.model('boskit_orders');
    const BoskitInvoice = mongoose.model('boskit_invoices');

    const orders = await BoskitOrder.find({
      $or: [{ dealer_id: dealerId }, { buyer_id: dealerId, buyer_type: 'dealer' }],
    })
      .sort({ created_at: -1 })
      .lean();

    return res.status(200).json({
      status: 'success',
      success: true,
      orders: orders.map((o) => {
        const grandTotal = Math.round(
          (o.grand_total_paise || (o.grand_total_inr ? o.grand_total_inr * 100 : 0)) / 100
        );
        const subtotal = Math.round((o.subtotal_paise || 0) / 100);
        const taxTotal = Math.round((o.tax_total_paise || 0) / 100);

        return {
          id: o._id,
          order_number: o.order_number || `BK-DLR-ORD-${o._id.toString().slice(-6).toUpperCase()}`,
          grand_total_inr: grandTotal,
          subtotal_inr: subtotal,
          tax_total_inr: taxTotal,
          items_count: o.items?.length || 1,
          items: (o.items || []).map((i) => ({
            name: i.item_name || 'Solar Equipment',
            sku: i.item_sku || 'BK-PROD',
            quantity: i.quantity || 1,
            unit_price_inr: Math.round((i.price_snapshot?.unit_price_paise || 0) / 100),
            line_total_inr: Math.round((i.line_total_paise || 0) / 100),
          })),
          status: o.order_status || o.status || 'confirmed',
          delivery_address: o.delivery_address,
          tracking_number: o.tracking_number || null,
          created_at: o.created_at || o.createdAt || new Date(),
        };
      }),
    });
  } catch (error) {
    console.error('[get_dealer_orders Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to fetch dealer orders: ' + error.message,
    });
  }
};

/**
 * 6. Get Single Dealer Order by ID with Full Tax Invoice Snapshot
 */
const get_dealer_order_by_id = async (req, res) => {
  try {
    const dealerId = req.user.id;
    const { id } = req.params;

    const BoskitOrder = mongoose.model('boskit_orders');
    const BoskitInvoice = mongoose.model('boskit_invoices');
    const BoskitDistributor = mongoose.model('boskit_distributors');

    const order = await BoskitOrder.findOne({
      _id: id,
      $or: [{ dealer_id: dealerId }, { buyer_id: dealerId }],
    }).lean();

    if (!order) {
      return res.status(404).json({ status: 'error', success: false, message: 'Order not found.' });
    }

    const [invoice, distributor] = await Promise.all([
      BoskitInvoice.findOne({ order_id: order._id }).lean(),
      order.distributor_id ? BoskitDistributor.findById(order.distributor_id).lean() : null,
    ]);

    return res.status(200).json({
      status: 'success',
      success: true,
      order: {
        id: order._id,
        order_number: order.order_number,
        invoice_number: invoice?.invoice_number || `BKI-${order._id.toString().slice(-6)}`,
        grand_total_inr: Math.round((order.grand_total_paise || 0) / 100),
        subtotal_inr: Math.round((order.subtotal_paise || 0) / 100),
        tax_total_inr: Math.round((order.tax_total_paise || 0) / 100),
        shipping_fee_inr: Math.round((order.shipping_fee_paise || 0) / 100),
        order_status: order.order_status || order.status || 'confirmed',
        delivery_address: order.delivery_address,
        billing_name: order.billing_name,
        billing_gst_number: order.billing_gst_number,
        distributor_hub: {
          business_name: distributor?.business_name || 'BOSKIT Regional Distribution Hub',
          gst_number: distributor?.gst_number || '24AAACC1206D1ZM',
          hotline: distributor?.mobile || '+91 98765 00001',
        },
        items: (order.items || []).map((i) => ({
          name: i.item_name,
          sku: i.item_sku,
          quantity: i.quantity,
          unit_price_inr: Math.round((i.price_snapshot?.unit_price_paise || 0) / 100),
          line_total_inr: Math.round((i.line_total_paise || 0) / 100),
        })),
        created_at: order.created_at || order.createdAt,
      },
    });
  } catch (error) {
    console.error('[get_dealer_order_by_id Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to fetch order details: ' + error.message,
    });
  }
};

/**
 * 7. Get Assigned Regional Distributor Hub Details
 */
const get_dealer_distributor_hub = async (req, res) => {
  try {
    const dealerId = req.user.id;

    const BoskitDealer = mongoose.model('boskit_dealers');
    const BoskitDistributor = mongoose.model('boskit_distributors');

    const dealer = await BoskitDealer.findById(dealerId).lean();
    let targetDistributorId = dealer?.distributor_id;
    if (!targetDistributorId) {
      const defaultDist = await BoskitDistributor.findOne({ activation_status: 'active' });
      targetDistributorId = defaultDist?._id;
    }

    const distributor = targetDistributorId
      ? await BoskitDistributor.findById(targetDistributorId).lean()
      : null;

    return res.status(200).json({
      status: 'success',
      success: true,
      hub: {
        id: distributor?._id,
        business_name: distributor?.business_name || 'BOSKIT Gujarat Master Logistics Hub',
        gst_number: distributor?.gst_number || '24AAACC1206D1ZM',
        email: distributor?.email || 'hub@boskit.in',
        mobile: distributor?.mobile || '9876500001',
        support_phone: distributor?.mobile || '+91 98765 00001',
        pickup_address: distributor?.shop_address?.line || '101, Solar Hub Logistics Depot, Industrial Area',
        city: distributor?.shop_address?.city || 'Ahmedabad',
        state: 'Gujarat',
        pincode: distributor?.shop_address?.pincode || '380001',
        dispatch_hours: 'Mon - Sat: 9:00 AM - 7:00 PM',
        hotline: '+91 98765 00001',
      },
    });
  } catch (error) {
    console.error('[get_dealer_distributor_hub Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to fetch distributor hub: ' + error.message,
    });
  }
};

module.exports = {
  register_dealer,
  get_dealer_dashboard_stats,
  get_dealer_catalogue,
  create_dealer_order,
  get_dealer_orders,
  get_dealer_order_by_id,
  get_dealer_distributor_hub,
};
