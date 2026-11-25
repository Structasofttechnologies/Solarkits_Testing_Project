'use strict';

const mongoose = require('mongoose');
require('../../models'); // Ensure all boskit schemas are registered
const PricingEngine = require('../../services/pricing_engine');
const { logBoskitAudit } = require('../../utils/audit_logger');
const { sendOTP } = require('../../../solarshop-india/utils/nodemailer');

/**
 * 1. Get Effective Distributor Entitlements Snapshot
 */
const get_distributor_entitlements = async (req, res) => {
  try {
    const distributorId = req.user.id;

    const BoskitDistributorPlanAssignment = mongoose.model('boskit_distributor_plan_assignments');
    const BoskitTerritory = mongoose.model('boskit_territories');
    const BoskitDealer = mongoose.model('boskit_dealers');

    const [assignment, territory, activeDealersCount] = await Promise.all([
      BoskitDistributorPlanAssignment.findOne({ distributor_id: distributorId, status: 'active' }).lean(),
      BoskitTerritory.findOne({ distributor_id: distributorId, status: 'active' })
        .populate('state_id', 'name code')
        .populate('district_id', 'name')
        .lean(),
      BoskitDealer.countDocuments({ distributor_id: distributorId, activation_status: 'active' }),
    ]);

    const snapshot = assignment?.plan_snapshot || {};
    const maxDealers = snapshot.max_dealers !== undefined ? snapshot.max_dealers : 15;
    const remainingSeats = maxDealers ? Math.max(0, maxDealers - activeDealersCount) : 'Unlimited';

    return res.status(200).json({
      status: 'success',
      success: true,
      entitlements: {
        plan_name: snapshot.name || 'District Distributor Tier',
        plan_code: snapshot.plan_code || 'BK-DIST-STARTER',
        validity: `${snapshot.validity_value || 12} ${snapshot.validity_unit || 'months'}`,
        expires_at: assignment?.expiry_date,
        territory_type: snapshot.territory_type || snapshot.territory_level || 'district',
        is_territory_exclusive: snapshot.is_territory_exclusive !== false,
        assigned_state: territory?.state_id?.name || territory?.state_name || 'Gujarat',
        assigned_district: territory?.district_id?.name || territory?.district_name || 'Ahmedabad',
        max_dealers: maxDealers,
        active_dealers: activeDealersCount,
        remaining_dealer_seats: remainingSeats,
        can_onboard_dealers: snapshot.can_onboard_dealers !== false && snapshot.dealer_allowed !== false,
        dealer_pricing_permission: snapshot.dealer_pricing_permission ?? false,
        product_access_type: snapshot.product_access_type || 'all',
        discount_percentage: snapshot.discount_percentage || 10,
        distributor_margin_slab: `${snapshot.distributor_margin_slab_min || 8}% – ${snapshot.distributor_margin_slab_max || 14}%`,
        can_sell_direct: snapshot.can_sell_direct !== false,
        can_reserve_stock: snapshot.can_reserve_stock !== false,
        stock_reservation_hours: snapshot.stock_reservation_hours || 48,
        min_order_value_inr: Math.round((snapshot.min_order_value_paise || 0) / 100),
        credit_limit_inr: Math.round((snapshot.credit_limit_paise || 0) / 100),
        dashboard_modules: snapshot.dashboard_modules || {
          overview: true,
          territories: true,
          catalogue: true,
          pricing: true,
          inventory: true,
          orders: true,
          customers: true,
          dealers: true,
          dealer_onboarding: true,
          leads: true,
          sales_reports: true,
          margin_reports: true,
          documents: true,
          support: true,
          subscriptions: true,
        },
      },
    });
  } catch (error) {
    console.error('[get_distributor_entitlements Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to fetch entitlements: ' + error.message,
    });
  }
};

/**
 * 2. Distributor Dashboard KPI Overview
 */
const get_distributor_dashboard_stats = async (req, res) => {
  try {
    const distributorId = req.user.id;

    const BoskitDistributor = mongoose.model('boskit_distributors');
    const BoskitDealer = mongoose.model('boskit_dealers');
    const BoskitDealerApplication = mongoose.model('boskit_dealer_applications');
    const BoskitOrder = mongoose.model('boskit_orders');
    const BoskitDistributorPlanAssignment = mongoose.model('boskit_distributor_plan_assignments');
    const BoskitTerritory = mongoose.model('boskit_territories');

    const [distributor, dealersCount, pendingDealerAppsCount, recentOrders, planAssignment, territory] = await Promise.all([
      BoskitDistributor.findById(distributorId).lean(),
      BoskitDealer.countDocuments({ distributor_id: distributorId, activation_status: 'active' }),
      BoskitDealerApplication.countDocuments({ distributor_id: distributorId, status: { $in: ['submitted', 'under_review'] } }),
      BoskitOrder.find({ distributor_id: distributorId }).sort({ created_at: -1 }).limit(5).lean(),
      BoskitDistributorPlanAssignment.findOne({ distributor_id: distributorId, status: 'active' }).lean(),
      BoskitTerritory.findOne({ distributor_id: distributorId, status: 'active' })
        .populate('state_id', 'name')
        .populate('district_id', 'name')
        .lean(),
    ]);

    const activePlan = planAssignment?.plan_snapshot || {};
    const maxDealers = activePlan.max_dealers !== undefined ? activePlan.max_dealers : 15;
    const remainingSeats = maxDealers ? Math.max(0, maxDealers - dealersCount) : 'Unlimited';

    return res.status(200).json({
      status: 'success',
      success: true,
      data: {
        distributor: {
          id: distributor._id,
          business_name: distributor.business_name,
          gst_number: distributor.gst_number,
          activation_status: distributor.activation_status,
          lifecycle_status: distributor.lifecycle_status,
        },
        metrics: {
          total_revenue_inr: 1250000,
          monthly_target_kw: 100,
          current_month_kw: 68.5,
          active_dealers_count: dealersCount,
          max_dealers_limit: maxDealers,
          remaining_dealer_seats: remainingSeats,
          pending_dealer_applications: pendingDealerAppsCount,
          wallet_balance_inr: 85000,
        },
        plan: {
          name: activePlan.name || 'District Distributor Tier',
          plan_code: activePlan.plan_code || 'BK-DIST-STARTER',
          expires_at: planAssignment?.expiry_date || null,
          territory_level: activePlan.territory_type || activePlan.territory_level || 'district',
          dashboard_modules: activePlan.dashboard_modules || {},
          can_onboard_dealers: activePlan.can_onboard_dealers !== false,
        },
        territory: {
          state: territory?.state_id?.name || territory?.state_name || 'Gujarat',
          district: territory?.district_id?.name || territory?.district_name || 'Ahmedabad',
          is_exclusive: territory?.is_exclusive !== false,
        },
        recent_orders: recentOrders.map((o) => ({
          id: o._id,
          order_number: o.order_number || `BK-ORD-${o._id.toString().slice(-6).toUpperCase()}`,
          buyer_type: o.buyer_type,
          grand_total_paise: o.grand_total_paise,
          grand_total_inr: Math.round((o.grand_total_paise || 0) / 100),
          status: o.status,
          created_at: o.created_at,
        })),
      },
    });
  } catch (error) {
    console.error('[get_distributor_dashboard_stats Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to fetch dashboard stats: ' + error.message,
    });
  }
};

/**
 * 3. Get Sub-Dealers Roster
 */
const get_distributor_dealers = async (req, res) => {
  try {
    const distributorId = req.user.id;
    const { search, status } = req.query;

    const BoskitDealer = mongoose.model('boskit_dealers');
    const query = { distributor_id: distributorId };

    if (status && status !== 'all') {
      query.activation_status = status;
    }
    if (search) {
      const q = search.toLowerCase();
      query.$or = [
        { business_name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { mobile: { $regex: q, $options: 'i' } },
        { dealer_code: { $regex: q, $options: 'i' } },
      ];
    }

    const dealers = await BoskitDealer.find(query).sort({ created_at: -1 }).lean();

    return res.status(200).json({
      status: 'success',
      success: true,
      dealers: dealers.map((d) => ({
        id: d._id,
        dealer_code: d.dealer_code || `BK-DLR-${d._id.toString().slice(-4).toUpperCase()}`,
        business_name: d.business_name,
        contact_person: d.authorized_person?.name || d.business_name,
        email: d.email,
        mobile: d.mobile,
        gst_number: d.gst_number || 'Unregistered',
        activation_status: d.activation_status,
        monthly_volume_kw: 12.5,
        total_orders_count: 8,
        pricing_tier: 'Standard Wholesale Slab',
        created_at: d.created_at,
      })),
    });
  } catch (error) {
    console.error('[get_distributor_dealers Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to fetch dealers: ' + error.message,
    });
  }
};

/**
 * 4. Generate Dealer Invitation Link & Send Invitation (Enforces Plan Entitlements & Quotas)
 */
const invite_dealer = async (req, res) => {
  try {
    const distributorId = req.user.id;
    const { business_name, email, mobile } = req.body;

    if (!mobile || !email) {
      return res.status(400).json({
        status: 'error',
        success: false,
        message: 'Dealer email and mobile are required.',
      });
    }

    const BoskitDistributor = mongoose.model('boskit_distributors');
    const BoskitDistributorPlanAssignment = mongoose.model('boskit_distributor_plan_assignments');
    const BoskitDealer = mongoose.model('boskit_dealers');

    // 1. Check Plan Permissions & Dealer Quota
    const [distributor, assignment, currentDealersCount] = await Promise.all([
      BoskitDistributor.findById(distributorId).lean(),
      BoskitDistributorPlanAssignment.findOne({ distributor_id: distributorId, status: 'active' }).lean(),
      BoskitDealer.countDocuments({ distributor_id: distributorId, activation_status: { $ne: 'deactivated' } }),
    ]);

    const snapshot = assignment?.plan_snapshot || {};
    if (snapshot.can_onboard_dealers === false || snapshot.dealer_allowed === false) {
      return res.status(403).json({
        status: 'error',
        success: false,
        code: 'DEALER_ONBOARDING_NOT_PERMITTED',
        message: 'Your current distributor tier does not permit sub-dealer onboarding. Please upgrade your distributor plan.',
      });
    }

    if (snapshot.max_dealers && currentDealersCount >= snapshot.max_dealers) {
      return res.status(403).json({
        status: 'error',
        success: false,
        code: 'DEALER_LIMIT_REACHED',
        message: `You have reached your tier quota limit of ${snapshot.max_dealers} dealer accounts. Please contact support or upgrade your plan to add more seats.`,
      });
    }

    // 2. Check Duplicate Dealer Email/Mobile
    const existingDealer = await BoskitDealer.findOne({
      $or: [{ email: email.toLowerCase() }, { mobile }],
    });
    if (existingDealer) {
      return res.status(400).json({
        status: 'error',
        success: false,
        message: 'A dealer account with this mobile or email is already registered in the system.',
      });
    }

    const inviteCode = `BK-INV-${distributorId.toString().slice(-4).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    const inviteLink = `http://localhost:5180/dealer/register?ref=${inviteCode}&distributor_id=${distributorId}`;

    // Send invitation email
    try {
      await sendOTP(
        email,
        'Authorized Solar Dealership Invitation',
        `<p>Dear Partner,</p><p>You have been invited by <strong>${distributor.business_name}</strong> to join the BOSKIT Authorized Solar Dealer Network.</p><p><a href="${inviteLink}" style="background:#1F8F4E;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;">Register Dealership</a></p>`,
        'BOSKIT Dealership'
      );
    } catch (mailErr) {
      console.warn('[Dealer Invite Email Warning]:', mailErr.message);
    }

    logBoskitAudit({
      actor_type: 'boskit_distributor',
      actor_id: distributorId,
      action: 'DEALER_INVITATION_SENT',
      entity_type: 'boskit_dealers',
      after_snapshot: { email, mobile, inviteCode },
      req,
    });

    return res.status(200).json({
      status: 'success',
      success: true,
      message: `Invitation successfully sent to ${email}.`,
      invite_link: inviteLink,
      invite_code: inviteCode,
      remaining_seats: snapshot.max_dealers ? Math.max(0, snapshot.max_dealers - (currentDealersCount + 1)) : 'Unlimited',
    });
  } catch (error) {
    console.error('[invite_dealer Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to generate invitation: ' + error.message,
    });
  }
};

/**
 * 5. Get Dealer Applications for this Distributor
 */
const get_distributor_dealer_applications = async (req, res) => {
  try {
    const distributorId = req.user.id;
    const BoskitDealerApplication = mongoose.model('boskit_dealer_applications');

    const applications = await BoskitDealerApplication.find({ distributor_id: distributorId })
      .populate('dealer_id', 'business_name email mobile gst_number')
      .sort({ created_at: -1 })
      .lean();

    return res.status(200).json({
      status: 'success',
      success: true,
      applications: applications.map((a) => ({
        id: a._id,
        dealer_id: a.dealer_id?._id,
        business_name: a.dealer_id?.business_name || 'N/A',
        email: a.dealer_id?.email || 'N/A',
        mobile: a.dealer_id?.mobile || 'N/A',
        gst_number: a.dealer_id?.gst_number || 'Unregistered',
        status: a.status,
        rejection_reason: a.rejection_reason,
        created_at: a.created_at,
      })),
    });
  } catch (error) {
    console.error('[get_distributor_dealer_applications Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to fetch dealer applications: ' + error.message,
    });
  }
};

/**
 * 6. Review Dealer Application
 */
const review_dealer_application = async (req, res) => {
  try {
    const distributorId = req.user.id;
    const { id } = req.params;
    const { action, rejection_reason } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        status: 'error',
        success: false,
        message: 'Action must be either "approve" or "reject".',
      });
    }

    const BoskitDealerApplication = mongoose.model('boskit_dealer_applications');
    const BoskitDealer = mongoose.model('boskit_dealers');
    const BoskitNotification = mongoose.model('boskit_notifications');
    const BoskitDistributorPlanAssignment = mongoose.model('boskit_distributor_plan_assignments');

    const app = await BoskitDealerApplication.findOne({ _id: id, distributor_id: distributorId });
    if (!app) {
      return res.status(404).json({
        status: 'error',
        success: false,
        message: 'Dealer application not found in your territory.',
      });
    }

    if (action === 'approve') {
      // Validate quota before approving
      const [assignment, activeDealersCount] = await Promise.all([
        BoskitDistributorPlanAssignment.findOne({ distributor_id: distributorId, status: 'active' }).lean(),
        BoskitDealer.countDocuments({ distributor_id: distributorId, activation_status: 'active' }),
      ]);
      const snapshot = assignment?.plan_snapshot || {};
      if (snapshot.max_dealers && activeDealersCount >= snapshot.max_dealers) {
        return res.status(403).json({
          status: 'error',
          success: false,
          code: 'DEALER_LIMIT_REACHED',
          message: `Cannot approve dealer: Maximum seat limit of ${snapshot.max_dealers} reached. Please upgrade your distributor plan.`,
        });
      }
    }

    const dealer = await BoskitDealer.findById(app.dealer_id);

    if (action === 'approve') {
      app.status = 'approved';
      if (dealer) {
        dealer.lifecycle_status = 'approved';
        dealer.activation_status = 'active';
        dealer.is_active = true;
        await dealer.save();
      }

      await BoskitNotification.create({
        recipient_type: 'boskit_dealer',
        recipient_id: app.dealer_id,
        event_type: 'dealer_approved',
        title: 'Dealer Account Approved! 🎉',
        message: 'Your dealership application has been approved. You may now log in to access wholesale pricing and order equipment.',
        priority: 'high',
        entity_type: 'boskit_dealer_applications',
        entity_id: app._id,
      });
    } else {
      app.status = 'rejected';
      app.rejection_reason = rejection_reason || 'Application not accepted by territory distributor.';
      if (dealer) {
        dealer.lifecycle_status = 'rejected';
        await dealer.save();
      }
    }

    await app.save();

    logBoskitAudit({
      actor_type: 'boskit_distributor',
      actor_id: distributorId,
      action: `DEALER_APPLICATION_${action.toUpperCase()}`,
      entity_type: 'boskit_dealer_applications',
      entity_id: app._id,
      req,
    });

    return res.status(200).json({
      status: 'success',
      success: true,
      message: `Dealer application ${action}d successfully.`,
    });
  } catch (error) {
    console.error('[review_dealer_application Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to review dealer application: ' + error.message,
    });
  }
};

/**
 * 7. Get Distributor Territory & Exclusivity
 */
const get_distributor_territory = async (req, res) => {
  try {
    const distributorId = req.user.id;

    const BoskitDistributor = mongoose.model('boskit_distributors');
    const BoskitTerritory = mongoose.model('boskit_territories');
    const BoskitDistributorPlanAssignment = mongoose.model('boskit_distributor_plan_assignments');

    const [distributor, territory, assignment] = await Promise.all([
      BoskitDistributor.findById(distributorId).lean(),
      BoskitTerritory.findOne({ distributor_id: distributorId, status: 'active' })
        .populate('state_id', 'name code')
        .populate('district_id', 'name')
        .lean(),
      BoskitDistributorPlanAssignment.findOne({ distributor_id: distributorId, status: 'active' }).lean(),
    ]);

    const stateName = territory?.state_id?.name || territory?.state_name || 'Gujarat';
    const districtName = territory?.district_id?.name || territory?.district_name || 'Ahmedabad';
    const isExclusive = territory?.is_exclusive !== false;

    return res.status(200).json({
      status: 'success',
      success: true,
      territory: {
        state: stateName,
        district: districtName,
        is_exclusive: isExclusive,
        protection_level: isExclusive ? 'Revenue District Exclusivity' : 'Non-Exclusive Regional Partner',
        valid_until: assignment?.expiry_date ? new Date(assignment.expiry_date).toISOString().split('T')[0] : '2027-08-17',
        permitted_categories: ['Tier-1 Inverters', 'TOPCon PV Modules', 'Pre-Engineered Mounting', 'BOS Kits'],
      },
    });
  } catch (error) {
    console.error('[get_distributor_territory Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to fetch territory: ' + error.message,
    });
  }
};

/**
 * 8. Get Distributor Subscription Plan Details (Snapshot-Driven)
 */
const get_distributor_plan = async (req, res) => {
  try {
    const distributorId = req.user.id;

    const BoskitDistributorPlanAssignment = mongoose.model('boskit_distributor_plan_assignments');
    const BoskitDealer = mongoose.model('boskit_dealers');

    const [assignment, activeDealersCount] = await Promise.all([
      BoskitDistributorPlanAssignment.findOne({ distributor_id: distributorId, status: 'active' }).lean(),
      BoskitDealer.countDocuments({ distributor_id: distributorId, activation_status: 'active' }),
    ]);

    const plan = assignment?.plan_snapshot || {};
    const maxDealers = plan.max_dealers !== undefined ? plan.max_dealers : 15;

    return res.status(200).json({
      status: 'success',
      success: true,
      plan: {
        name: plan.name || 'District Distributor Tier (Starter)',
        plan_code: plan.plan_code || 'BK-DIST-STARTER',
        description: plan.description || 'Core solar equipment distribution tier with single-district exclusivity.',
        joining_fee_inr: Math.round((assignment?.amount_paid_paise || plan.joining_fee_paise || 2500000) / 100),
        renewal_fee_inr: Math.round((plan.renewal_fee_paise || 1000000) / 100),
        started_at: assignment?.start_date || new Date(),
        expires_at: assignment?.expiry_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        status: assignment?.status || 'active',
        max_dealers: maxDealers,
        active_dealers: activeDealersCount,
        remaining_dealer_seats: maxDealers ? Math.max(0, maxDealers - activeDealersCount) : 'Unlimited',
        can_onboard_dealers: plan.can_onboard_dealers !== false && plan.dealer_allowed !== false,
        benefits: plan.benefits || [
          'Guaranteed District Exclusivity',
          'Full Whitelisted Catalogue Access',
          'Direct Manufacturer Warranty Dispatch',
        ],
        dashboard_modules: plan.dashboard_modules || {},
      },
    });
  } catch (error) {
    console.error('[get_distributor_plan Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to fetch plan details: ' + error.message,
    });
  }
};

/**
 * 9. Get Distributor Wholesale Catalogue & Dealer Pricing Slabs
 */
const get_distributor_catalogue = async (req, res) => {
  try {
    const distributorId = req.user.id;
    const { category, search } = req.query;

    const BoskitDistributorPlanAssignment = mongoose.model('boskit_distributor_plan_assignments');
    const BoskitPriceRule = mongoose.model('boskit_price_rules');
    const { Product } = require('../../../admin-panel/models/core_db');

    // 1. Get distributor's active plan discount slab
    const assignment = await BoskitDistributorPlanAssignment.findOne({
      distributor_id: distributorId,
      status: 'active',
    }).lean();

    const planSnapshot = assignment?.plan_snapshot || {};
    const baseDiscountPercent = planSnapshot.discount_percentage || 15;
    const defaultMarginMin = planSnapshot.distributor_margin_slab_min || 8;
    const defaultMarginMax = planSnapshot.distributor_margin_slab_max || 14;
    const defaultDealerMargin = Math.round((defaultMarginMin + defaultMarginMax) / 2) || 10;

    // 2. Fetch custom margin overrides set by this distributor
    const customRules = await BoskitPriceRule.find({
      scope: 'user_override',
      distributor_id: distributorId,
    }).lean();

    const ruleMap = {};
    customRules.forEach((r) => {
      if (r.product_id) {
        ruleMap[r.product_id.toString()] = r;
      }
    });

    // 3. Fetch products and BOS kits from DB
    let dbQuery = { is_active: { $ne: false }, deleted_at: null };
    if (search) {
      dbQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku_code: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }

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
        .lean()
    ]);

    let products = productsFromDb || [];

    // Map BOS kits into unified product shape for wholesale catalogue
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
      image_url: bk.imageUrl || bk.image || 'https://images.unsplash.com/photo-1592833159057-651427788523?w=800&auto=format&fit=crop&q=80',
      specifications: {
        category: bk.category,
        subCategory: bk.subCategory,
        systemType: bk.systemType,
        projectRange: bk.projectRange,
        warranty: bk.warranty || '5 Years Replacement',
        components: (bk.components || []).join(', ')
      }
    }));

    products = [...mappedBosKits, ...products];

    // Filter by category if requested
    if (category && category !== 'all') {
      products = products.filter((p) => (p.category || '').toLowerCase() === category.toLowerCase() || (p.category_id === category));
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      products = products.filter((p) => 
        (p.name || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
      );
    }

    const BoskitOrder = mongoose.model('boskit_orders');
    const distributorOrders = await BoskitOrder.find({
      $or: [
        { buyer_id: distributorId, buyer_type: 'distributor' },
        { distributor_id: distributorId },
      ],
      order_status: { $nin: ['cancelled'] },
    }).lean();

    const purchasedStockMap = {};
    (distributorOrders || []).forEach((ord) => {
      (ord.items || []).forEach((item) => {
        const prodKey = (item.product_id || item.kit_id || item._id)?.toString();
        if (prodKey) {
          purchasedStockMap[prodKey] = (purchasedStockMap[prodKey] || 0) + (item.quantity || 1);
        }
      });
    });

    const items = products.map((p) => {
      const prodId = p._id.toString();
      const rawCostInr = p.base_price_paise ? Math.round(p.base_price_paise / 100) : null;
      const mrp = p.mrp || (p.mrp_paise ? Math.round(p.mrp_paise / 100) : (rawCostInr ? Math.round(rawCostInr * 1.25) : 10000));

      // Distributor buy price = direct distributor_price / ourPrice or raw cost or discounted MRP
      const distributorBuyPrice = p.distributor_price || rawCostInr || Math.round(mrp * (1 - baseDiscountPercent / 100));

      // Check if distributor set custom margin for this product
      const customRule = ruleMap[prodId];
      let dealerMarginPercent = defaultDealerMargin;
      let isWhitelisted = true;

      if (customRule) {
        if (customRule.margin_percent !== undefined) {
          dealerMarginPercent = customRule.margin_percent;
        }
        if (customRule.is_active !== undefined) {
          isWhitelisted = customRule.is_active;
        }
      }

      // Dealer selling price = Distributor buy price + Margin %
      const marginAmount = Math.round(distributorBuyPrice * (dealerMarginPercent / 100));
      const dealerSellPrice = distributorBuyPrice + marginAmount;

      const specObj = p.specifications || {};
      const warrantyStr = p.warranty || specObj.Warranty || specObj.warranty || '10 Years Factory Warranty';

      const purchasedQty = purchasedStockMap[prodId] || 0;
      const hasPurchased = purchasedQty > 0;

      return {
        id: prodId,
        name: p.name,
        sku: p.sku || p.sku_code || `BK-${prodId.slice(-6).toUpperCase()}`,
        category: p.category || (p.name.toLowerCase().includes('panel') || p.name.toLowerCase().includes('module') ? 'panels' : p.name.toLowerCase().includes('inverter') ? 'inverters' : p.name.toLowerCase().includes('battery') ? 'batteries' : 'boskit'),
        brand: p.brand_name || p.brand || p.brand_id?.name || 'SolarKits Premium',
        brand_logo: p.brand_id?.logo_url || null,
        mrp_inr: mrp,
        distributor_buy_price_inr: distributorBuyPrice,
        distributor_discount_percent: baseDiscountPercent,
        dealer_margin_percent: dealerMarginPercent,
        dealer_sell_price_inr: dealerSellPrice,
        distributor_profit_per_unit_inr: marginAmount,
        purchased_stock_qty: purchasedQty,
        has_purchased: hasPurchased,
        is_whitelisted_for_dealers: customRule ? (customRule.is_active !== false) : true,
        moq: p.moq || p.min_order_qty || 1,
        image_url: p.image_url || p.image || p.imageUrl || 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80',
        specifications: specObj,
        in_stock: true,
        warranty_years: warrantyStr,
      };
    });

    const totalPurchasedStock = Object.values(purchasedStockMap).reduce((a, b) => a + b, 0);

    return res.status(200).json({
      status: 'success',
      success: true,
      plan_name: planSnapshot.name || 'District Distributor Tier',
      plan_discount_percent: baseDiscountPercent,
      default_margin_slab: `${defaultMarginMin}% – ${defaultMarginMax}%`,
      total_products: items.length,
      total_purchased_stock_units: totalPurchasedStock,
      products: items,
    });
  } catch (error) {
    console.error('[get_distributor_catalogue Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to load distributor wholesale catalogue: ' + error.message,
    });
  }
};

/**
 * 10. Set / Update Distributor Dealer Margin for a Product
 */
const set_distributor_product_margin = async (req, res) => {
  try {
    const distributorId = req.user.id;
    const { product_id, margin_percent, dealer_sell_price_inr, is_whitelisted } = req.body;

    if (!product_id) {
      return res.status(400).json({
        status: 'error',
        success: false,
        message: 'Product ID is required.',
      });
    }

    const BoskitPriceRule = mongoose.model('boskit_price_rules');
    const ruleCode = `OVR-DIST-${distributorId.toString().slice(-4)}-${product_id.toString().slice(-4)}`.toUpperCase();

    const validProductId = mongoose.Types.ObjectId.isValid(product_id) ? product_id : null;

    const ruleData = {
      rule_name: `Distributor Custom Dealer Margin Rule [${ruleCode}]`,
      rule_code: ruleCode,
      scope: 'user_override',
      distributor_id: distributorId,
      product_id: validProductId,
      rule_type: 'fixed_dealer_rate',
      discount_percentage: margin_percent !== undefined ? parseFloat(margin_percent) : 10,
      dealer_rate_paise: dealer_sell_price_inr ? Math.round(dealer_sell_price_inr * 100) : null,
      status: is_whitelisted !== false ? 'active' : 'inactive',
    };

    const updatedRule = await BoskitPriceRule.findOneAndUpdate(
      { rule_code: ruleCode },
      { $set: ruleData },
      { upsert: true, new: true }
    );

    logBoskitAudit({
      actor_type: 'boskit_distributor',
      actor_id: distributorId,
      action: 'SET_PRODUCT_DEALER_MARGIN',
      entity_type: 'boskit_price_rules',
      entity_id: updatedRule._id,
      req,
    });

    return res.status(200).json({
      status: 'success',
      success: true,
      message: 'Dealer selling price and margin slab updated successfully!',
      rule: updatedRule,
    });
  } catch (error) {
    console.error('[set_distributor_product_margin Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to update dealer margin: ' + error.message,
    });
  }
};

/**
 * 11. Create Distributor Wholesale Procurement Order
 */
const create_distributor_procurement_order = async (req, res) => {
  try {
    const distributorId = req.user.id;
    const { items, shipping_address, payment_mode = 'advance_bank_transfer', notes } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({
        status: 'error',
        success: false,
        message: 'Order items are required.',
      });
    }

    const pricing = await PricingEngine.calculate({
      items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity || 1 })),
      buyer_type: 'distributor',
      buyer_id: distributorId,
      origin_state_code: 'GJ',
      destination_state_code: shipping_address?.state_code || 'GJ',
    });

    const BoskitOrder = mongoose.model('boskit_orders');
    const year = new Date().getFullYear();
    const orderNumber = `BK-${year}-${Date.now().toString().slice(-6)}`;

    const orderItems = pricing.items.map((i) => ({
      scope_type: 'product',
      product_id: mongoose.Types.ObjectId.isValid(i.product_id) ? i.product_id : null,
      item_name: i.product_name || 'Wholesale Solar Equipment',
      item_sku: i.sku || 'BK-PROD',
      quantity: i.quantity,
      price_snapshot: {
        base_mrp_paise: i.unit_mrp_paise,
        rule_id: i.applied_rule_id ? new mongoose.Types.ObjectId(i.applied_rule_id) : null,
        rule_scope: i.applied_rule_scope || 'distributor_plan',
        discount_type: i.discount_type || 'percentage',
        discount_value: i.discount_value || 0,
        price_before_gst_paise: i.unit_base_price_paise,
        gst_pct: i.gst_rate_percent,
        gst_amount_paise: Math.round(i.total_tax_paise / (i.quantity || 1)),
        unit_price_paise: i.unit_base_price_paise,
        moq: i.moq,
        moq_met: i.moq_met,
        pricing_explanation: `Distributor Wholesale Rate (Rule: ${i.applied_rule_name})`,
      },
      line_total_paise: i.line_grand_total_paise,
    }));

    const [order] = await BoskitOrder.create([
      {
        order_number: orderNumber,
        buyer_type: 'distributor',
        buyer_id: distributorId,
        distributor_id: null,
        items: orderItems,
        subtotal_paise: pricing.summary.subtotal_paise,
        tax_total_paise: pricing.summary.total_tax_paise,
        shipping_fee_paise: pricing.summary.shipping_paise,
        discount_total_paise: pricing.summary.total_discount_paise,
        grand_total_paise: pricing.summary.grand_total_paise,
        order_status: 'confirmed',
        payment_status: 'pending',
        delivery_address: {
          line: shipping_address?.line || 'Distributor Central Depot',
          city: shipping_address?.city || 'Ahmedabad',
          pincode: shipping_address?.pincode || '380001',
          contact_name: shipping_address?.contact_person || 'Warehouse Incharge',
          contact_phone: shipping_address?.contact_phone || '9876500001',
        },
        billing_name: shipping_address?.contact_person || 'Authorized Distributor',
        status_history: [
          {
            status: 'confirmed',
            actor_type: 'boskit_distributor',
            actor_id: distributorId,
            comment: notes || 'Wholesale procurement order initiated.',
          },
        ],
      },
    ]);

    return res.status(201).json({
      status: 'success',
      success: true,
      message: `Wholesale procurement order ${orderNumber} placed successfully! Dispatch scheduled from central warehouse.`,
      order: {
        id: order._id,
        order_number: order.order_number,
        grand_total_inr: Math.round(pricing.summary.grand_total_paise / 100),
        status: order.order_status,
      },
    });
  } catch (error) {
    console.error('[create_distributor_procurement_order Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Procurement order failed: ' + error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 12. Distributor Industry Showcase APIs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 12.1 Get Active Industries for Distributor Portal
 */
const get_distributor_industries = async (req, res) => {
  try {
    const { IndustryType } = require('../../../admin-panel/models/core_db');
    const industries = await IndustryType.find({
      is_active: true,
      deleted_at: null,
      for_epc: true,
    })
      .sort({ sort_order: 1 })
      .select('name code slug description icon thumbnail sort_order')
      .lean();

    return res.status(200).json({
      status: 'success',
      success: true,
      data: industries.map(i => ({ ...i, id: i._id })),
    });
  } catch (error) {
    console.error('[get_distributor_industries Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to fetch industries: ' + error.message,
    });
  }
};

/**
 * 12.2 Get Distributor Industry Dashboard Content (Visual Gallery & Hero)
 */
const get_distributor_dashboard_content = async (req, res) => {
  try {
    const { industry_type_id, placement } = req.query;
    if (!industry_type_id || !mongoose.Types.ObjectId.isValid(industry_type_id)) {
      return res.status(400).json({ status: 'error', success: false, message: 'Valid industry_type_id is required' });
    }

    const {
      IndustryContent,
      IndustryContentIndustryMap,
      IndustryContentMedia,
    } = require('../../../admin-panel/models/core_db');

    const now = new Date();

    // Find content IDs mapped to this industry
    const maps = await IndustryContentIndustryMap.find({
      industry_type_id,
      deleted_at: null,
    }).select('content_id').lean();

    const content_ids = maps.map(m => m.content_id);
    if (!content_ids.length) {
      return res.status(200).json({ status: 'success', success: true, data: [] });
    }

    const filter = {
      _id: { $in: content_ids },
      status: 'PUBLISHED',
      is_active: true,
      target_audience: { $in: ['DISTRIBUTOR', 'EPC', 'BOTH'] },
      deleted_at: null,
      $or: [
        { start_at: null },
        { start_at: { $lte: now } },
      ],
      $and: [
        {
          $or: [
            { end_at: null },
            { end_at: { $gte: now } },
          ],
        },
      ],
    };

    if (placement) filter.placement = placement;

    const contents = await IndustryContent.find(filter)
      .sort({ priority: -1, display_order: 1, published_at: -1 })
      .lean();

    // Fetch media
    const cids = contents.map(c => c._id);
    const mediaList = await IndustryContentMedia.find({
      content_id: { $in: cids },
      deleted_at: null,
      processing_status: { $ne: 'FAILED' },
    }).sort({ is_primary: -1, sort_order: 1, created_at: 1 }).lean();

    const mediaMap = {};
    for (const m of mediaList) {
      const cid = m.content_id.toString();
      if (!mediaMap[cid]) mediaMap[cid] = [];
      mediaMap[cid].push({ ...m, id: m._id });
    }

    const data = contents.map(c => ({
      ...c,
      id: c._id,
      // Distribute per-role CTAs if available
      cta_label: c.distributor_cta_label || c.cta_label || 'View BOS Kit',
      cta_url: c.distributor_cta_url || c.cta_url || '/distributor/portal/procure',
      media: mediaMap[c._id.toString()] || [],
    }));

    return res.status(200).json({ status: 'success', success: true, data });
  } catch (error) {
    console.error('[get_distributor_dashboard_content Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to fetch dashboard content: ' + error.message,
    });
  }
};

/**
 * 12.3 Get Industry Theme Configuration
 */
const get_distributor_industry_theme = async (req, res) => {
  try {
    const { industry_type_id } = req.query;
    if (!industry_type_id || !mongoose.Types.ObjectId.isValid(industry_type_id)) {
      return res.status(400).json({ status: 'error', success: false, message: 'Valid industry_type_id is required' });
    }

    const { IndustryTheme } = require('../../../admin-panel/models/core_db');
    const theme = await IndustryTheme.findOne({
      industry_type_id,
      is_active: true,
      deleted_at: null,
    }).lean();

    return res.status(200).json({ status: 'success', success: true, data: theme ? { ...theme, id: theme._id } : null });
  } catch (error) {
    console.error('[get_distributor_industry_theme Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to fetch theme: ' + error.message,
    });
  }
};

/**
 * 12.4 Get Related Products for Industry
 */
const get_distributor_industry_related_products = async (req, res) => {
  try {
    const { industry_type_id, limit = 8 } = req.query;
    const BoskitProduct = mongoose.model('boskit_products');

    const filter = { status: 'active', deleted_at: null };
    if (industry_type_id && mongoose.Types.ObjectId.isValid(industry_type_id)) {
      filter.industry_type_id = industry_type_id;
    }

    const products = await BoskitProduct.find(filter)
      .limit(Number(limit))
      .lean();

    return res.status(200).json({
      status: 'success',
      success: true,
      data: products.map(p => ({
        id: p._id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        brand: p.brand_name || 'SolarKits BOS',
        thumbnail_url: p.primary_image || p.thumbnail_url,
        mrp_inr: p.mrp_inr || (p.mrp_paise ? Math.round(p.mrp_paise / 100) : 0),
        b2b_price_inr: p.b2b_base_price_inr || (p.b2b_base_price_paise ? Math.round(p.b2b_base_price_paise / 100) : 0),
      })),
    });
  } catch (error) {
    console.error('[get_distributor_industry_related_products Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to fetch products: ' + error.message,
    });
  }
};

module.exports = {
  get_distributor_entitlements,
  get_distributor_dashboard_stats,
  get_distributor_dealers,
  invite_dealer,
  get_distributor_dealer_applications,
  review_dealer_application,
  get_distributor_territory,
  get_distributor_plan,
  get_distributor_catalogue,
  set_distributor_product_margin,
  create_distributor_procurement_order,
  get_distributor_industries,
  get_distributor_dashboard_content,
  get_distributor_industry_theme,
  get_distributor_industry_related_products,
};
