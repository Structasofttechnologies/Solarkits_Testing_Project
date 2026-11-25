'use strict';

const mongoose = require('mongoose');
require('../../models'); // Ensure all boskit schemas are registered

/**
 * Default fallback plans with clean distributor terminology
 */
const DEFAULT_PLANS = [
  {
    name: 'District Distributor Tier (Starter)',
    plan_code: 'BK-DIST-STARTER',
    short_description: 'Designed for single-district distributor operations with core solar equipment catalogue access.',
    description: 'Designed for single-district distributor operations with core solar equipment catalogue access.',
    validity_value: 12,
    validity_unit: 'months',
    joining_fee_paise: 2500000, // ₹25,000
    renewal_fee_paise: 1000000, // ₹10,000
    tax_rate_percent: 18,
    territory_type: 'district',
    allowed_territories_count: 1,
    is_territory_exclusive: true,
    max_dealers: 15,
    dealer_allowed: true,
    can_see_mrp: true,
    status: 'published',
    is_active: true,
    sort_order: 0,
    benefits: [
      '1 Dedicated Revenue District Exclusivity',
      'Up to 15 Registered Local Dealers',
      'Full BOS Component Whitelist',
      'Direct Manufacturer Warranty Dispatch',
      'Real-time Inventory Reservations',
      'Standard Technical & Logistics Support',
    ],
    is_popular: false,
    badge_text: 'District Scale',
  },
  {
    name: 'Multi-District Growth Tier (Professional)',
    plan_code: 'BK-DIST-GROWTH',
    short_description: 'Optimal for expanding solar distribution businesses across high-volume industrial and commercial districts.',
    description: 'Optimal for expanding solar distribution businesses across high-volume industrial and commercial districts.',
    validity_value: 12,
    validity_unit: 'months',
    joining_fee_paise: 5000000, // ₹50,000
    renewal_fee_paise: 2000000, // ₹20,000
    tax_rate_percent: 18,
    territory_type: 'multiple_districts',
    allowed_territories_count: 3,
    is_territory_exclusive: true,
    max_dealers: 50,
    dealer_allowed: true,
    can_see_mrp: true,
    status: 'published',
    is_active: true,
    sort_order: 1,
    benefits: [
      '3 Exclusive Revenue Districts',
      'Up to 50 Registered Local Dealers',
      'Priority Warehouse Inventory Allocation',
      'Full BOS Component Whitelist',
      'Direct Manufacturer Warranty Dispatch',
      'Dedicated Regional Account Manager',
      'Co-branded Marketing & Lead Referral',
    ],
    is_popular: true,
    badge_text: 'Most Popular Distributor Plan',
  },
  {
    name: 'State Enterprise Distributor (Apex)',
    plan_code: 'BK-DIST-APEX',
    short_description: 'State-wide master distribution hub with highest tier commercial margin slabs and direct factory dispatch lines.',
    description: 'State-wide master distribution hub with highest tier commercial margin slabs and direct factory dispatch lines.',
    validity_value: 24,
    validity_unit: 'months',
    joining_fee_paise: 15000000, // ₹1,50,000
    renewal_fee_paise: 5000000,  // ₹50,000
    tax_rate_percent: 18,
    territory_type: 'state',
    allowed_territories_count: 1,
    is_territory_exclusive: true,
    max_dealers: 200,
    dealer_allowed: true,
    can_see_mrp: true,
    status: 'published',
    is_active: true,
    sort_order: 2,
    benefits: [
      'Entire State Territory Exclusivity',
      'Up to 200 Registered Local Dealers',
      'Full BOS Component Whitelist',
      'Direct Manufacturer Warranty Dispatch',
      'Direct Factory Dispatch & Bulk Container Rates',
      '24/7 Dedicated Tier-1 Escalation Desk',
      'Full ERP & API Inventory Integration',
    ],
    is_popular: false,
    badge_text: 'State Master Tier',
  },
];

/**
 * 1. Get Public Product Catalogue (combining Products & BOS Kits)
 */
const get_products = async (req, res) => {
  try {
    const { category, search, brand, page = 1, limit = 20 } = req.query;
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

    const { Product } = require('../../../admin-panel/models/core_db');
    let BosKitModel;
    try {
      BosKitModel = mongoose.model('bos_kits');
    } catch {
      BosKitModel = require('../../../solarshop-india/models/india_solarshop_db/bos_kits.schema');
    }

    let query = { deleted_at: null, is_active: { $ne: false } };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku_code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const [productsList, bosKitsList] = await Promise.all([
      Product.find(query)
        .populate('brand_id', 'name logo_url')
        .sort({ is_featured: -1, created_at: -1 })
        .lean(),
      BosKitModel.find({ deleted_at: null, is_active: { $ne: false } })
        .sort({ createdAt: -1 })
        .lean()
    ]);

    const formattedProducts = productsList.map((p) => {
      const mrpVal = p.mrp || (p.base_price_paise ? Math.round(p.base_price_paise / 100 * 1.25) : 9999);
      const ourPriceVal = p.base_price_paise ? Math.round(p.base_price_paise / 100) : mrpVal;

      return {
        id: p._id,
        name: p.name,
        sku: p.sku_code || p.sku || `BK-${p._id.toString().slice(-6).toUpperCase()}`,
        category: p.category || (p.name.toLowerCase().includes('panel') || p.name.toLowerCase().includes('module') ? 'panels' : p.name.toLowerCase().includes('inverter') ? 'inverters' : p.name.toLowerCase().includes('battery') ? 'batteries' : 'boskit'),
        brand: p.brand_id?.name || (p.name.includes('Tata') ? 'Tata Power Solar' : p.name.includes('Waaree') ? 'Waaree Energies' : p.name.includes('Adani') ? 'Adani Solar' : p.name.includes('Havells') ? 'Havells' : p.name.includes('Growatt') ? 'Growatt' : p.name.includes('Exide') ? 'Exide' : 'SolarKits Pro'),
        brand_logo: p.brand_id?.logo_url || null,
        mrp: mrpVal,
        our_price: ourPriceVal,
        moq: p.moq || 1,
        image_url: p.image_url || p.image || 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80',
        in_stock: p.stock_quantity !== undefined ? p.stock_quantity > 0 : true,
        rating: 4.9,
        reviews_count: 28,
        features: p.features || [],
        components: p.components || [],
        specifications: p.specifications || {},
        warranty: p.warranty || p.specifications?.Warranty || p.specifications?.warranty || '10 Years Replacement'
      };
    });

    const formattedBosKits = bosKitsList.map((bk) => ({
      id: bk._id,
      name: bk.name,
      sku: `BK-KIT-${bk._id.toString().slice(-6).toUpperCase()}`,
      category: 'boskit',
      subCategory: bk.subCategory,
      systemType: bk.systemType,
      projectRange: bk.projectRange,
      brand: 'SolarKits ProBOS',
      brand_logo: null,
      mrp: bk.marketPrice || Math.round((bk.ourPrice || 10000) * 1.35),
      our_price: bk.ourPrice,
      moq: 1,
      image_url: bk.imageUrl || bk.image || 'https://images.unsplash.com/photo-1592833159057-651427788523?w=800&auto=format&fit=crop&q=80',
      in_stock: bk.inStock !== false,
      available_stock: bk.availableStock || 25,
      rating: bk.rating || 4.9,
      reviews_count: bk.reviewsCount || 32,
      components: bk.components || [],
      specifications: bk.specifications || {},
      warranty: bk.warranty || '5 Years Replacement',
      badge: bk.badge || 'Certified BOS Kit'
    }));

    let allItems = [...formattedBosKits, ...formattedProducts];

    // Filter by category if requested
    if (category && category !== 'all') {
      allItems = allItems.filter(item => 
        (item.category || '').toLowerCase() === category.toLowerCase() ||
        (item.category || '').toLowerCase().includes(category.toLowerCase()) ||
        (item.subCategory || '').toLowerCase().includes(category.toLowerCase())
      );
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      allItems = allItems.filter(item =>
        (item.name || '').toLowerCase().includes(q) ||
        (item.sku || '').toLowerCase().includes(q) ||
        (item.category || '').toLowerCase().includes(q)
      );
    }

    const total = allItems.length;
    const paginated = allItems.slice(skip, skip + parseInt(limit, 10));

    return res.status(200).json({
      status: 'success',
      success: true,
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
      products: paginated,
    });
  } catch (error) {
    console.error('[get_products Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to fetch catalogue: ' + error.message,
    });
  }
};

/**
 * 2. Get Public Product Detail
 */
const get_product_detail = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        status: 'error',
        success: false,
        message: 'Product not found.',
      });
    }

    const { Product } = require('../../../admin-panel/models/core_db');
    let BosKitModel;
    try {
      BosKitModel = mongoose.model('bos_kits');
    } catch {
      BosKitModel = require('../../../solarshop-india/models/india_solarshop_db/bos_kits.schema');
    }

    // Try finding in BosKitModel first
    const bosKit = await BosKitModel.findById(id).lean();
    if (bosKit) {
      return res.status(200).json({
        status: 'success',
        success: true,
        product: {
          id: bosKit._id,
          name: bosKit.name,
          sku: `BK-KIT-${bosKit._id.toString().slice(-6).toUpperCase()}`,
          category: 'boskit',
          subCategory: bosKit.subCategory,
          systemType: bosKit.systemType,
          projectRange: bosKit.projectRange,
          brand: 'SolarKits ProBOS',
          mrp: bosKit.marketPrice || Math.round((bosKit.ourPrice || 10000) * 1.35),
          our_price: bosKit.ourPrice,
          moq: 1,
          description: `Certified turnkey Balance of System (BOS) kit engineered for high-performance solar installations conforming to Indian grid & MNRE specifications.`,
          components: bosKit.components || [],
          specs: bosKit.specifications || {},
          warranty: bosKit.warranty || '5 Years Replacement',
          image_url: bosKit.imageUrl || bosKit.image || 'https://images.unsplash.com/photo-1592833159057-651427788523?w=800&auto=format&fit=crop&q=80',
          in_stock: bosKit.inStock !== false,
          available_stock: bosKit.availableStock || 25,
          rating: bosKit.rating || 4.9,
          reviews_count: bosKit.reviewsCount || 32,
        },
      });
    }

    const product = await Product.findById(id).populate('brand_id', 'name logo_url').lean();

    if (!product) {
      return res.status(404).json({
        status: 'error',
        success: false,
        message: 'Product not found.',
      });
    }

    return res.status(200).json({
      status: 'success',
      success: true,
      product: {
        id: product._id,
        name: product.name,
        sku: product.sku_code || product.sku || `BK-${product._id.toString().slice(-6).toUpperCase()}`,
        brand: product.brand_id?.name || 'BOSKIT',
        mrp: product.mrp || Math.round((product.base_price_paise || 1000000) / 100 * 1.25) || 9999,
        moq: product.moq || 1,
        description: product.description,
        specs: product.specifications || {},
        image_url: product.image_url || product.image || 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80',
        in_stock: product.stock_quantity !== undefined ? product.stock_quantity > 0 : true,
      },
    });
  } catch (error) {
    console.error('[get_product_detail Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to retrieve product details.',
    });
  }
};

/**
 * 3. Get Public Distributor Plans (Dynamically from published DB plans)
 */
const get_plans = async (req, res) => {
  try {
    const BoskitDistributorPlan = mongoose.model('boskit_distributor_plans');
    let plans = await BoskitDistributorPlan.find({
      status: 'published',
      is_active: true,
      deleted_at: null,
    }).sort({ sort_order: 1, created_at: -1 }).lean();

    if (!plans || plans.length === 0) {
      // Seed default clean distributor plans if DB is empty
      try {
        await BoskitDistributorPlan.insertMany(DEFAULT_PLANS);
        plans = await BoskitDistributorPlan.find({
          status: 'published',
          is_active: true,
          deleted_at: null,
        }).sort({ sort_order: 1 }).lean();
      } catch (seedErr) {
        plans = DEFAULT_PLANS;
      }
    }

    const formatted = plans.map((p) => {
      const joiningFeeInr = Math.round((p.joining_fee_paise || 0) / 100);
      const renewalFeeInr = Math.round((p.renewal_fee_paise || 0) / 100);
      const validityDisplay = `${p.validity_value || 12} ${p.validity_unit || 'months'}`;
      const territoryLevel = p.territory_type || p.territory_level || 'district';
      const maxDealersDisplay = p.max_dealers ? `${p.max_dealers} Dealer Accounts` : 'Unlimited Dealer Accounts';

      const benefitsList = (p.benefits && p.benefits.length > 0) ? p.benefits : [
        `${p.allowed_territories_count || 1} ${territoryLevel} Exclusivity`,
        `Up to ${maxDealersDisplay}`,
        'Full BOS Component Whitelist',
        'Direct Manufacturer Warranty Dispatch',
        'Real-time Inventory Reservations',
      ];

      return {
        id: p._id || p.plan_code,
        name: p.name,
        plan_code: p.plan_code,
        short_description: p.short_description || p.description,
        description: p.description,
        joining_fee_paise: p.joining_fee_paise || 0,
        joining_fee_inr: joiningFeeInr,
        renewal_fee_inr: renewalFeeInr,
        tax_rate_percent: p.tax_rate_percent ?? 18,
        is_tax_inclusive: p.is_tax_inclusive ?? false,
        validity_value: p.validity_value || 12,
        validity_unit: p.validity_unit || 'months',
        validity_display: validityDisplay,
        territory_type: territoryLevel,
        territory_level: territoryLevel,
        allowed_territories_count: p.allowed_territories_count || 1,
        is_territory_exclusive: p.is_territory_exclusive !== false,
        max_dealers: p.max_dealers || 'Unlimited',
        max_dealers_display: maxDealersDisplay,
        dealer_allowed: p.dealer_allowed !== false,
        features: benefitsList,
        benefits: benefitsList,
        is_popular: p.is_popular || p.plan_code === 'BK-DIST-GROWTH',
        badge_text: p.badge_text || (p.is_popular ? 'Most Popular Distributor Plan' : null),
        sort_order: p.sort_order || 0,
      };
    });

    return res.status(200).json({
      status: 'success',
      success: true,
      plans: formatted,
    });
  } catch (error) {
    console.error('[get_plans Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to retrieve plans: ' + error.message,
    });
  }
};

/**
 * 3.1 Get Single Public Plan Detail
 */
const get_plan_detail = async (req, res) => {
  try {
    const { codeOrId } = req.params;
    const BoskitDistributorPlan = mongoose.model('boskit_distributor_plans');

    let plan = null;
    if (mongoose.Types.ObjectId.isValid(codeOrId)) {
      plan = await BoskitDistributorPlan.findOne({ _id: codeOrId, deleted_at: null }).lean();
    }
    if (!plan) {
      plan = await BoskitDistributorPlan.findOne({ plan_code: codeOrId.toUpperCase(), deleted_at: null }).lean();
    }

    if (!plan) {
      return res.status(404).json({
        status: 'error',
        success: false,
        message: 'Plan not found.',
      });
    }

    return res.status(200).json({
      status: 'success',
      success: true,
      plan: {
        id: plan._id,
        name: plan.name,
        plan_code: plan.plan_code,
        short_description: plan.short_description || plan.description,
        description: plan.description,
        joining_fee_inr: Math.round((plan.joining_fee_paise || 0) / 100),
        renewal_fee_inr: Math.round((plan.renewal_fee_paise || 0) / 100),
        tax_rate_percent: plan.tax_rate_percent ?? 18,
        validity_display: `${plan.validity_value || 12} ${plan.validity_unit || 'months'}`,
        territory_type: plan.territory_type || 'district',
        allowed_territories_count: plan.allowed_territories_count || 1,
        is_territory_exclusive: plan.is_territory_exclusive !== false,
        max_dealers: plan.max_dealers || 15,
        benefits: plan.benefits || [],
        dashboard_modules: plan.dashboard_modules || {},
        is_popular: plan.is_popular || false,
        badge_text: plan.badge_text || null,
      },
    });
  } catch (error) {
    console.error('[get_plan_detail Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to retrieve plan details.',
    });
  }
};

/**
 * 3.2 Check Territory Availability Live (Exclusivity Conflict Detection)
 */
const check_territory_availability = async (req, res) => {
  try {
    const { state_id, district_id } = req.body;

    if (!state_id) {
      return res.status(400).json({
        status: 'error',
        success: false,
        message: 'state_id is required.',
      });
    }

    const BoskitTerritory = mongoose.model('boskit_territories');
    const query = {
      state_id: new mongoose.Types.ObjectId(state_id),
      status: 'active',
      is_exclusive: true,
    };

    if (district_id) {
      query.district_id = new mongoose.Types.ObjectId(district_id);
    }

    const existing = await BoskitTerritory.findOne(query).populate('distributor_id', 'business_name').lean();

    if (existing) {
      const maskedName = existing.distributor_id?.business_name
        ? existing.distributor_id.business_name.slice(0, 3) + '***'
        : 'Active Distributor';

      return res.status(200).json({
        status: 'success',
        success: true,
        available: false,
        is_available: false,
        message: `This territory is currently exclusively allocated to an authorized distributor (${maskedName}).`,
        territory: {
          state_id: existing.state_id,
          district_id: existing.district_id,
          is_exclusive: true,
        },
      });
    }

    return res.status(200).json({
      status: 'success',
      success: true,
      available: true,
      is_available: true,
      message: 'Territory is open and available for exclusive distributor allocation!',
    });
  } catch (error) {
    console.error('[check_territory_availability Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to verify territory availability: ' + error.message,
    });
  }
};

/**
 * 4. Get Public Content & Banners
 */
const get_content = async (req, res) => {
  try {
    const BoskitContentItem = mongoose.model('boskit_content_items');
    const items = await BoskitContentItem.find({
      target_platform: { $in: ['boskit', 'both'] },
      status: 'published',
      deleted_at: null,
    }).sort({ priority: 1 }).lean();

    return res.status(200).json({
      status: 'success',
      success: true,
      banners: items.length > 0 ? items : [
        {
          title: 'India’s Next-Gen Solar B2B Distribution Ecosystem',
          description: 'Direct manufacturer pricing, guaranteed territorial exclusivity, and a seamless digital procurement engine for distributors & authorized dealers.',
          cta_text: 'Become a Distributor',
          cta_url: '/distributor',
          badge: '⚡ Powered by SOLARKITS Infrastructure',
        }
      ],
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to fetch content.',
    });
  }
};

/**
 * 5. Track Application Status
 */
const get_application_status = async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({
        status: 'error',
        success: false,
        message: 'Please provide your registered Mobile number or Application ID.',
      });
    }

    const cleanId = identifier.trim();
    const isObjectId = mongoose.Types.ObjectId.isValid(cleanId);
    const isEmail = cleanId.includes('@');

    const BoskitDistributor = mongoose.model('boskit_distributors');
    const BoskitDistributorApplication = mongoose.model('boskit_distributor_applications');

    let query = {};
    if (isObjectId) {
      query._id = cleanId;
    } else if (isEmail) {
      query.email = cleanId.toLowerCase();
    } else {
      query.mobile = cleanId;
    }

    const distributor = await BoskitDistributor.findOne(query).select('business_name email mobile lifecycle_status activation_status created_at').lean();

    if (!distributor) {
      return res.status(404).json({
        status: 'error',
        success: false,
        message: 'No distributor application found with the provided details.',
      });
    }

    const application = await BoskitDistributorApplication.findOne({ distributor_id: distributor._id })
      .select('status step_completed status_history rejection_reason more_info_request created_at updated_at')
      .lean();

    return res.status(200).json({
      status: 'success',
      success: true,
      application: {
        application_id: application?._id || distributor._id,
        business_name: distributor.business_name,
        mobile_masked: distributor.mobile.slice(0, 2) + '******' + distributor.mobile.slice(-2),
        current_status: application?.status || distributor.lifecycle_status,
        step_completed: application?.step_completed || 1,
        total_steps: 16,
        progress_percentage: Math.min(100, Math.round(((application?.step_completed || 1) / 16) * 100)),
        rejection_reason: application?.rejection_reason || null,
        more_info_request: application?.more_info_request || null,
        submitted_at: application?.created_at || distributor.created_at,
        last_updated: application?.updated_at || distributor.created_at,
      },
    });
  } catch (error) {
    console.error('[get_application_status Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to look up application status.',
    });
  }
};

/**
 * 6. Submit Contact Inquiry
 */
const submit_contact_inquiry = async (req, res) => {
  try {
    const { name, email, mobile, subject, message, inquiry_type = 'general' } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        status: 'error',
        success: false,
        message: 'Name, email, and message are required.',
      });
    }

    console.log(`[BOSKIT Contact Inquiry] From: ${name} (${email}, ${mobile || 'N/A'}) | Type: ${inquiry_type} | Message: ${message}`);

    return res.status(200).json({
      status: 'success',
      success: true,
      message: 'Thank you for reaching out! Our regional distribution team will contact you within 24 hours.',
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to send inquiry.',
    });
  }
};

module.exports = {
  get_products,
  get_product_detail,
  get_plans,
  get_plan_detail,
  check_territory_availability,
  get_content,
  get_application_status,
  submit_contact_inquiry,
};
