'use strict';

const mongoose = require('mongoose');
const { logBoskitAudit } = require('../../utils/audit_logger');
const { sendOTP } = require('../../../solarshop-india/utils/nodemailer');

/**
 * 1. Platform Overview & Metrics
 */
const get_admin_stats = async (req, res) => {
  try {
    const BoskitDistributor = mongoose.model('boskit_distributors');
    const BoskitDistributorApplication = mongoose.model('boskit_distributor_applications');
    const BoskitDealer = mongoose.model('boskit_dealers');
    const BoskitDistributorPlan = mongoose.model('boskit_distributor_plans');

    const [
      totalApplications,
      underReviewCount,
      approvedCount,
      rejectedCount,
      activeDistributors,
      activeDealers,
      totalPlansCount,
      publishedPlansCount,
      recentApplications,
    ] = await Promise.all([
      BoskitDistributorApplication.countDocuments(),
      BoskitDistributorApplication.countDocuments({ status: { $in: ['under_review', 'submitted', 'gst_verified'] } }),
      BoskitDistributorApplication.countDocuments({ status: { $in: ['approved', 'active'] } }),
      BoskitDistributorApplication.countDocuments({ status: 'rejected' }),
      BoskitDistributor.countDocuments({ activation_status: 'active' }),
      BoskitDealer.countDocuments({ activation_status: 'active' }),
      BoskitDistributorPlan.countDocuments({ deleted_at: null }),
      BoskitDistributorPlan.countDocuments({ status: 'published', is_active: true, deleted_at: null }),
      BoskitDistributorApplication.find()
        .populate('distributor_id', 'business_name email mobile gst_number')
        .sort({ updated_at: -1 })
        .limit(6)
        .lean(),
    ]);

    return res.status(200).json({
      status: 'success',
      success: true,
      data: {
        total_applications: totalApplications,
        pending_reviews: underReviewCount,
        approved_applications: approvedCount,
        rejected_applications: rejectedCount,
        active_distributors: activeDistributors,
        active_dealers: activeDealers,
        total_plans: totalPlansCount,
        published_plans: publishedPlansCount,
        recent_applications: recentApplications.map((a) => ({
          id: a._id,
          distributor_id: a.distributor_id?._id,
          business_name: a.distributor_id?.business_name || 'N/A',
          email: a.distributor_id?.email || 'N/A',
          mobile: a.distributor_id?.mobile || 'N/A',
          gst_number: a.distributor_id?.gst_number || 'Pending',
          status: a.status,
          step_completed: a.step_completed || 1,
          updated_at: a.updated_at,
        })),
      },
    });
  } catch (error) {
    console.error('[get_admin_stats Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to fetch admin stats: ' + error.message,
    });
  }
};

/**
 * 2. Get Paginated Distributor Applications
 */
const get_distributor_applications = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const BoskitDistributorApplication = mongoose.model('boskit_distributor_applications');
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    const [total, applications] = await Promise.all([
      BoskitDistributorApplication.countDocuments(query),
      BoskitDistributorApplication.find(query)
        .populate('distributor_id', 'business_name email mobile gst_number lifecycle_status activation_status registered_address')
        .sort({ updated_at: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
    ]);

    let filtered = applications;
    if (search) {
      const q = search.toLowerCase();
      filtered = applications.filter((a) => {
        const d = a.distributor_id || {};
        return (
          (d.business_name && d.business_name.toLowerCase().includes(q)) ||
          (d.email && d.email.toLowerCase().includes(q)) ||
          (d.mobile && d.mobile.includes(q)) ||
          (d.gst_number && d.gst_number.toLowerCase().includes(q))
        );
      });
    }

    return res.status(200).json({
      status: 'success',
      success: true,
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
      applications: filtered.map((a) => ({
        id: a._id,
        distributor_id: a.distributor_id?._id,
        business_name: a.distributor_id?.business_name || 'N/A',
        email: a.distributor_id?.email || 'N/A',
        mobile: a.distributor_id?.mobile || 'N/A',
        gst_number: a.distributor_id?.gst_number || null,
        status: a.status,
        step_completed: a.step_completed || 1,
        total_steps: 17,
        rejection_reason: a.rejection_reason,
        more_info_request: a.more_info_request,
        created_at: a.created_at,
        updated_at: a.updated_at,
      })),
    });
  } catch (error) {
    console.error('[get_distributor_applications Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to fetch applications: ' + error.message,
    });
  }
};

/**
 * 3. Get Application Detail with KYC & Plans
 */
const get_distributor_application_detail = async (req, res) => {
  try {
    const { id } = req.params;

    const BoskitDistributorApplication = mongoose.model('boskit_distributor_applications');
    const BoskitDistributor = mongoose.model('boskit_distributors');
    const BoskitDistributorKyc = mongoose.model('boskit_distributor_kyc');
    const BoskitDistributorPlan = mongoose.model('boskit_distributor_plans');

    let app = await BoskitDistributorApplication.findById(id).lean();
    if (!app && mongoose.Types.ObjectId.isValid(id)) {
      app = await BoskitDistributorApplication.findOne({ distributor_id: id }).lean();
    }

    if (!app) {
      return res.status(404).json({
        status: 'error',
        success: false,
        message: 'Application not found.',
      });
    }

    const [distributor, kyc, plans] = await Promise.all([
      BoskitDistributor.findById(app.distributor_id).lean(),
      BoskitDistributorKyc.findOne({ distributor_id: app.distributor_id }).lean(),
      BoskitDistributorPlan.find({ is_active: true, deleted_at: null }).sort({ sort_order: 1 }).lean(),
    ]);

    return res.status(200).json({
      status: 'success',
      success: true,
      data: {
        application: app,
        distributor,
        kyc,
        plans,
      },
    });
  } catch (error) {
    console.error('[get_distributor_application_detail Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to fetch application detail: ' + error.message,
    });
  }
};

/**
 * 4. Review Application (Approve / Reject / Request Info)
 */
const review_distributor_application = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, rejection_reason, more_info_request, internal_notes } = req.body;
    const adminId = req.user?.id || 'admin_user';
    const validAdminId = mongoose.Types.ObjectId.isValid(adminId) ? adminId : null;

    const BoskitDistributorApplication = mongoose.model('boskit_distributor_applications');
    const BoskitDistributor = mongoose.model('boskit_distributors');
    const BoskitNotification = mongoose.model('boskit_notifications');

    let app = await BoskitDistributorApplication.findById(id);
    if (!app && mongoose.Types.ObjectId.isValid(id)) {
      app = await BoskitDistributorApplication.findOne({ distributor_id: id });
    }

    if (!app) {
      return res.status(404).json({
        status: 'error',
        success: false,
        message: 'Application not found.',
      });
    }

    const distributor = await BoskitDistributor.findById(app.distributor_id);
    if (!distributor) {
      return res.status(404).json({
        status: 'error',
        success: false,
        message: 'Associated distributor account not found.',
      });
    }

    let targetStatus;
    let notifTitle;
    let notifMessage;

    if (action === 'approve') {
      targetStatus = 'approved';
      notifTitle = 'Distributor Application Approved! 🎉';
      notifMessage = 'Your distributor dealership application has been approved. Your account is now being configured for territory lock and catalog access.';
      distributor.lifecycle_status = 'approved';
      distributor.approved_by = validAdminId;
      distributor.approved_at = new Date();
    } else if (action === 'reject') {
      targetStatus = 'rejected';
      app.rejection_reason = rejection_reason || 'Application does not meet current onboarding criteria.';
      notifTitle = 'Distributor Application Update';
      notifMessage = `Your distributor application has been declined: ${app.rejection_reason}`;
      distributor.lifecycle_status = 'rejected';
      distributor.rejection_reason = app.rejection_reason;
    } else if (action === 'request_info') {
      targetStatus = 'more_info_required';
      app.more_info_request = more_info_request || 'Additional documentation required for compliance.';
      notifTitle = 'Action Required: Additional Information Needed';
      notifMessage = `Please update your distributor dossier: ${app.more_info_request}`;
      distributor.lifecycle_status = 'more_info_required';
      distributor.more_info_request = app.more_info_request;
    } else {
      return res.status(400).json({
        status: 'error',
        success: false,
        message: 'Invalid review action. Must be: approve, reject, or request_info.',
      });
    }

    if (internal_notes) app.internal_notes = internal_notes;
    app.status = targetStatus;
    app.status_history.push({
      status: targetStatus,
      actor_type: 'cms_user',
      actor_id: validAdminId,
      note: rejection_reason || more_info_request || internal_notes || `Application ${action}d by admin.`,
      timestamp: new Date(),
    });

    await Promise.all([app.save(), distributor.save()]);

    // Send Notification
    await BoskitNotification.create({
      recipient_type: 'boskit_distributor',
      recipient_id: distributor._id,
      event_type: `distributor_${targetStatus}`,
      title: notifTitle,
      message: notifMessage,
      priority: 'high',
      entity_type: 'boskit_distributor_applications',
      entity_id: app._id,
    });

    logBoskitAudit({
      actor_type: 'cms_user',
      actor_id: validAdminId,
      action: `DISTRIBUTOR_APPLICATION_${action.toUpperCase()}`,
      entity_type: 'boskit_distributor_applications',
      entity_id: app._id,
      after_snapshot: { status: targetStatus, notes: internal_notes },
      req,
    });

    return res.status(200).json({
      status: 'success',
      success: true,
      message: `Application marked as ${targetStatus}.`,
      data: {
        application_id: app._id,
        current_status: targetStatus,
      },
    });
  } catch (error) {
    console.error('[review_distributor_application Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to review application: ' + error.message,
    });
  }
};

/**
 * 5. Activate Distributor Account (Plan Snapshot & Exclusive Territory Lock)
 */
const activate_distributor_account = async (req, res) => {
  try {
    const { id } = req.params;
    const { plan_id, state_id, district_id, allow_override = false, override_reason = '' } = req.body;
    const adminId = req.user?.id || 'admin_user';
    const validAdminId = mongoose.Types.ObjectId.isValid(adminId) ? adminId : null;

    const BoskitDistributor = mongoose.model('boskit_distributors');
    const BoskitDistributorApplication = mongoose.model('boskit_distributor_applications');
    const BoskitDistributorPlan = mongoose.model('boskit_distributor_plans');
    const BoskitPlanVersion = mongoose.model('boskit_plan_versions');
    const BoskitDistributorPlanAssignment = mongoose.model('boskit_distributor_plan_assignments');
    const BoskitTerritory = mongoose.model('boskit_territories');
    const BoskitNotification = mongoose.model('boskit_notifications');

    let distributor = await BoskitDistributor.findById(id);
    if (!distributor && mongoose.Types.ObjectId.isValid(id)) {
      const app = await BoskitDistributorApplication.findById(id);
      if (app) distributor = await BoskitDistributor.findById(app.distributor_id);
    }

    if (!distributor) {
      return res.status(404).json({
        status: 'error',
        success: false,
        message: 'Distributor not found.',
      });
    }

    // 1. Resolve Plan
    let selectedPlan = null;
    if (plan_id && mongoose.Types.ObjectId.isValid(plan_id)) {
      selectedPlan = await BoskitDistributorPlan.findById(plan_id);
    }
    if (!selectedPlan) {
      selectedPlan = await BoskitDistributorPlan.findOne({ status: 'published', is_active: true }).sort({ sort_order: 1 });
    }
    if (!selectedPlan) {
      selectedPlan = await BoskitDistributorPlan.findOne({ is_active: true }).sort({ sort_order: 1 });
    }

    if (!selectedPlan) {
      return res.status(400).json({
        status: 'error',
        success: false,
        message: 'No distributor plan found to assign. Please create and publish a plan first.',
      });
    }

    // 2. Resolve Plan Version Snapshot
    let planVersion = await BoskitPlanVersion.findOne({ plan_id: selectedPlan._id }).sort({ version_number: -1 });
    if (!planVersion) {
      const snapshotData = selectedPlan.toObject ? selectedPlan.toObject() : selectedPlan;
      planVersion = await BoskitPlanVersion.create({
        plan_id: selectedPlan._id,
        version_number: selectedPlan.current_version || 1,
        snapshot: snapshotData,
        published_by: validAdminId,
      });
    }

    const planSnapshot = planVersion.snapshot || (selectedPlan.toObject ? selectedPlan.toObject() : selectedPlan);

    // 3. Territory Conflict Check
    const targetStateId = state_id || distributor.shop_address?.state_id;
    const targetDistrictId = district_id || distributor.shop_address?.district_id;

    if (targetDistrictId && selectedPlan.is_territory_exclusive) {
      const existingAssignment = await BoskitTerritory.findOne({
        district_id: targetDistrictId,
        is_exclusive: true,
        status: 'active',
        distributor_id: { $ne: distributor._id },
      }).populate('distributor_id', 'business_name email mobile');

      if (existingAssignment && !allow_override) {
        return res.status(409).json({
          status: 'error',
          success: false,
          code: 'TERRITORY_EXCLUSIVE_CONFLICT',
          message: `Revenue district is already exclusively allocated to active distributor: ${existingAssignment.distributor_id?.business_name || 'Existing Partner'}. Set allow_override=true with mandatory reason to override.`,
          conflict: {
            distributor_id: existingAssignment.distributor_id?._id,
            business_name: existingAssignment.distributor_id?.business_name,
            district_name: existingAssignment.district_name,
          },
        });
      }
    }

    // 4. Create Plan Assignment with Immutable Snapshot
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + (selectedPlan.validity_value || 12));

    const assignment = await BoskitDistributorPlanAssignment.create({
      distributor_id: distributor._id,
      plan_id: selectedPlan._id,
      plan_version_id: planVersion._id,
      plan_snapshot: planSnapshot,
      assignment_type: 'admin_override',
      start_date: new Date(),
      expiry_date: expiresAt,
      amount_paid_paise: selectedPlan.joining_fee_paise || 0,
      currency: selectedPlan.currency || 'INR',
      status: 'active',
      assigned_by: validAdminId,
      notes: `Activated by admin on plan ${selectedPlan.name}`,
    });

    // 5. Create or Update Territory Assignment
    if (targetStateId) {
      await BoskitTerritory.updateMany(
        { distributor_id: distributor._id, status: 'active' },
        { $set: { status: 'released' } }
      );

      await BoskitTerritory.create({
        distributor_id: distributor._id,
        state_id: targetStateId,
        district_id: targetDistrictId || null,
        is_exclusive: selectedPlan.is_territory_exclusive !== false,
        status: 'active',
        assignment_source: allow_override ? 'admin_override' : 'admin_assigned',
        override_reason: allow_override ? override_reason : null,
        assigned_by: validAdminId,
      });
    }

    // 6. Update Distributor Entity
    distributor.lifecycle_status = 'active';
    distributor.activation_status = 'active';
    distributor.is_active = true;
    distributor.plan_assignment_id = assignment._id;
    distributor.activated_by = validAdminId;
    distributor.activated_at = new Date();

    if (targetStateId) distributor.shop_address.state_id = targetStateId;
    if (targetDistrictId) distributor.shop_address.district_id = targetDistrictId;

    await distributor.save();

    // 7. Update Application
    await BoskitDistributorApplication.updateOne(
      { distributor_id: distributor._id },
      {
        $set: { status: 'approved' },
        $push: {
          status_history: {
            status: 'approved',
            actor_type: 'cms_user',
            actor_id: validAdminId,
            note: `Distributor activated with plan ${selectedPlan.name} (v${planVersion.version_number})`,
            timestamp: new Date(),
          },
        },
      }
    );

    // 8. Send Notification
    await BoskitNotification.create({
      recipient_type: 'boskit_distributor',
      recipient_id: distributor._id,
      event_type: 'distributor_activated',
      title: 'Distributor Account Activated! 🚀',
      message: `Your account is active on plan: ${selectedPlan.name}. You now have full access to wholesale equipment pricing and sub-dealer network onboarding.`,
      priority: 'high',
      entity_type: 'boskit_distributors',
      entity_id: distributor._id,
    });

    logBoskitAudit({
      actor_type: 'cms_user',
      actor_id: validAdminId,
      action: 'DISTRIBUTOR_ACTIVATED',
      entity_type: 'boskit_distributors',
      entity_id: distributor._id,
      after_snapshot: {
        plan_code: selectedPlan.plan_code,
        version: planVersion.version_number,
        assignment_id: assignment._id,
      },
      req,
    });

    return res.status(200).json({
      status: 'success',
      success: true,
      message: `Distributor ${distributor.business_name} activated successfully on plan ${selectedPlan.name}.`,
      data: {
        distributor_id: distributor._id,
        assignment_id: assignment._id,
        plan_code: selectedPlan.plan_code,
        version: planVersion.version_number,
      },
    });
  } catch (error) {
    console.error('[activate_distributor_account Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to activate distributor: ' + error.message,
    });
  }
};

/**
 * 6. Get Authorized Distributors List
 */
const get_distributors = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const BoskitDistributor = mongoose.model('boskit_distributors');
    const query = { deleted_at: null };

    if (status && status !== 'all') {
      query.activation_status = status;
    }

    const [total, distributors] = await Promise.all([
      BoskitDistributor.countDocuments(query),
      BoskitDistributor.find(query)
        .populate('plan_assignment_id')
        .populate('shop_address.state_id', 'name code')
        .populate('shop_address.district_id', 'name')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
    ]);

    let filtered = distributors;
    if (search) {
      const q = search.toLowerCase();
      filtered = distributors.filter((d) => (
        (d.business_name && d.business_name.toLowerCase().includes(q)) ||
        (d.email && d.email.toLowerCase().includes(q)) ||
        (d.mobile && d.mobile.includes(q)) ||
        (d.gst_number && d.gst_number.toLowerCase().includes(q))
      ));
    }

    return res.status(200).json({
      status: 'success',
      success: true,
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
      distributors: filtered.map((d) => ({
        id: d._id,
        business_name: d.business_name,
        email: d.email,
        mobile: d.mobile,
        gst_number: d.gst_number || 'Unregistered',
        lifecycle_status: d.lifecycle_status,
        activation_status: d.activation_status,
        plan_name: d.plan_assignment_id?.plan_snapshot?.name || 'Standard Distributor',
        plan_code: d.plan_assignment_id?.plan_snapshot?.plan_code || 'BK-DIST-STD',
        plan_expires_at: d.plan_assignment_id?.expiry_date,
        state: d.shop_address?.state_id?.name || 'Gujarat',
        district: d.shop_address?.district_id?.name || 'Ahmedabad',
        dealers_count: 5,
        created_at: d.created_at,
      })),
    });
  } catch (error) {
    console.error('[get_distributors Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to fetch distributors: ' + error.message,
    });
  }
};

/**
 * 7. Get All Distributor Plans (Admin view with comprehensive configuration)
 */
const get_plans = async (req, res) => {
  try {
    const { status, search } = req.query;
    const BoskitDistributorPlan = mongoose.model('boskit_distributor_plans');
    const BoskitDistributorPlanAssignment = mongoose.model('boskit_distributor_plan_assignments');

    const query = { deleted_at: null };
    if (status && status !== 'all') {
      query.status = status;
    }

    const { cleanAndSeedPlans } = require('../../services/plan_seeder.service');
    let plans = await BoskitDistributorPlan.find(query).sort({ sort_order: 1, created_at: -1 }).lean();

    const hasLegacyFranchise = plans.some(p => /franchise/i.test(p.name) || /Apex Multi-District/i.test(p.name));
    if (plans.length === 0 || hasLegacyFranchise) {
      await cleanAndSeedPlans();
      plans = await BoskitDistributorPlan.find(query).sort({ sort_order: 1, created_at: -1 }).lean();
    }
    // Fetch subscriber counts per plan
    const counts = await BoskitDistributorPlanAssignment.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$plan_id', count: { $sum: 1 } } },
    ]);
    const subscriberMap = {};
    counts.forEach((c) => {
      subscriberMap[c._id.toString()] = c.count;
    });

    const formatted = plans.map((p) => ({
      id: p._id,
      name: p.name,
      plan_code: p.plan_code,
      short_description: p.short_description || '',
      description: p.description || '',
      joining_fee_paise: p.joining_fee_paise,
      joining_fee_inr: Math.round((p.joining_fee_paise || 0) / 100),
      renewal_fee_paise: p.renewal_fee_paise,
      renewal_fee_inr: Math.round((p.renewal_fee_paise || 0) / 100),
      currency: p.currency || 'INR',
      tax_rate_percent: p.tax_rate_percent ?? 18,
      is_tax_inclusive: p.is_tax_inclusive ?? false,
      gst_hsn_code: p.gst_hsn_code || '998399',
      billing_type: p.billing_type || 'annual_recurring',
      validity_value: p.validity_value || 12,
      validity_unit: p.validity_unit || 'months',
      validity_display: `${p.validity_value || 12} ${p.validity_unit || 'months'}`,
      auto_renew: p.auto_renew ?? false,
      grace_period_days: p.grace_period_days ?? 15,
      renewal_rules: p.renewal_rules || '',
      territory_type: p.territory_type || 'district',
      allowed_territories_count: p.allowed_territories_count || 1,
      is_territory_exclusive: p.is_territory_exclusive !== false,
      dealer_allowed: p.dealer_allowed !== false,
      max_dealers: p.max_dealers ?? 15,
      can_onboard_dealers: p.can_onboard_dealers !== false,
      dealer_direct_activation: p.dealer_direct_activation ?? false,
      dealer_pricing_permission: p.dealer_pricing_permission ?? false,
      dealer_uses_admin_slabs_only: p.dealer_uses_admin_slabs_only !== false,
      max_dealer_credit_limit_paise: p.max_dealer_credit_limit_paise || 0,
      allows_all_products: p.allows_all_products !== false,
      product_access_type: p.product_access_type || 'all',
      discount_percentage: p.discount_percentage ?? 10,
      distributor_margin_slab_min: p.distributor_margin_slab_min ?? 8,
      distributor_margin_slab_max: p.distributor_margin_slab_max ?? 14,
      pricing_tier: p.pricing_tier || 'Standard Wholesale Slab',
      can_see_mrp: p.can_see_mrp !== false,
      can_sell_direct: p.can_sell_direct !== false,
      can_generate_quotes: p.can_generate_quotes !== false,
      lead_access_tier: p.lead_access_tier || 'standard',
      leads_per_month: p.leads_per_month ?? 25,
      inventory_visibility: p.inventory_visibility || 'full',
      can_reserve_stock: p.can_reserve_stock !== false,
      stock_reservation_hours: p.stock_reservation_hours ?? 48,
      min_order_value_paise: p.min_order_value_paise || 0,
      min_order_value_inr: Math.round((p.min_order_value_paise || 0) / 100),
      max_orders_per_month: p.max_orders_per_month ?? null,
      credit_limit_paise: p.credit_limit_paise || 0,
      credit_limit_inr: Math.round((p.credit_limit_paise || 0) / 100),
      credit_period_days: p.credit_period_days ?? 0,
      benefits: p.benefits && p.benefits.length > 0 ? p.benefits : [
        `${p.allowed_territories_count || 1} ${p.territory_type || 'district'} Exclusivity`,
        `Up to ${p.max_dealers || 15} Dealer Accounts`,
        'Full BOS Component Whitelist',
        'Direct Manufacturer Warranty Dispatch',
        'Real-time Inventory Reservations',
      ],
      dashboard_modules: p.dashboard_modules || {
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
      is_popular: p.is_popular ?? false,
      badge_text: p.badge_text || 'Most Popular Distributor Plan',
      sort_order: p.sort_order ?? 0,
      status: p.status || (p.is_active ? 'published' : 'draft'),
      is_active: p.is_active ?? true,
      current_version: p.current_version || 1,
      effective_from: p.effective_from,
      effective_to: p.effective_to,
      subscribers_count: subscriberMap[p._id.toString()] || 0,
      created_at: p.created_at,
      updated_at: p.updated_at,
    }));

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
      message: 'Failed to fetch plans: ' + error.message,
    });
  }
};

/**
 * 8. Create New Distributor Plan
 */
const create_plan = async (req, res) => {
  try {
    const adminId = req.user?.id || 'admin_user';
    const validAdminId = mongoose.Types.ObjectId.isValid(adminId) ? adminId : null;
    const BoskitDistributorPlan = mongoose.model('boskit_distributor_plans');
    const BoskitPlanVersion = mongoose.model('boskit_plan_versions');

    const {
      name,
      plan_code,
      short_description,
      description,
      joining_fee_inr,
      joining_fee_paise,
      renewal_fee_inr,
      renewal_fee_paise,
      tax_rate_percent = 18,
      is_tax_inclusive = false,
      gst_hsn_code = '998399',
      billing_type = 'annual_recurring',
      validity_value = 12,
      validity_unit = 'months',
      auto_renew = false,
      grace_period_days = 15,
      renewal_rules = '',
      territory_type = 'district',
      allowed_territories_count = 1,
      is_territory_exclusive = true,
      dealer_allowed = true,
      max_dealers = 15,
      can_onboard_dealers = true,
      dealer_direct_activation = false,
      dealer_pricing_permission = false,
      dealer_uses_admin_slabs_only = true,
      allows_all_products = true,
      product_access_type = 'all',
      discount_percentage = 10,
      distributor_margin_slab_min = 8,
      distributor_margin_slab_max = 14,
      pricing_tier = 'Standard Wholesale Slab',
      can_see_mrp = true,
      can_sell_direct = true,
      can_generate_quotes = true,
      lead_access_tier = 'standard',
      leads_per_month = 25,
      inventory_visibility = 'full',
      can_reserve_stock = true,
      stock_reservation_hours = 48,
      min_order_value_inr,
      credit_limit_inr,
      benefits = [],
      dashboard_modules = {},
      is_popular = false,
      badge_text = 'Most Popular Distributor Plan',
      sort_order = 0,
      status = 'published',
      effective_from,
      effective_to,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        status: 'error',
        success: false,
        message: 'Plan name is required.',
      });
    }

    const cleanCode = (plan_code || `BK-DIST-${name.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase().slice(0, 15)}_${Date.now().toString().slice(-4)}`).toUpperCase();

    // Check duplicate code
    const existing = await BoskitDistributorPlan.findOne({ plan_code: cleanCode });
    if (existing) {
      return res.status(400).json({
        status: 'error',
        success: false,
        message: `Plan with code ${cleanCode} already exists.`,
      });
    }

    const calculatedJoiningPaise = joining_fee_paise !== undefined ? joining_fee_paise : Math.round((joining_fee_inr || 0) * 100);
    const calculatedRenewalPaise = renewal_fee_paise !== undefined ? renewal_fee_paise : Math.round((renewal_fee_inr || 0) * 100);
    const calculatedMinOrderPaise = min_order_value_inr !== undefined ? Math.round(min_order_value_inr * 100) : 0;
    const calculatedCreditLimitPaise = credit_limit_inr !== undefined ? Math.round(credit_limit_inr * 100) : 0;

    const plan = await BoskitDistributorPlan.create({
      name,
      plan_code: cleanCode,
      short_description,
      description,
      joining_fee_paise: calculatedJoiningPaise,
      renewal_fee_paise: calculatedRenewalPaise,
      tax_rate_percent,
      is_tax_inclusive,
      gst_hsn_code,
      billing_type,
      validity_value,
      validity_unit,
      auto_renew,
      grace_period_days,
      renewal_rules,
      territory_type,
      allowed_territories_count,
      is_territory_exclusive,
      dealer_allowed,
      max_dealers,
      can_onboard_dealers,
      dealer_direct_activation,
      dealer_pricing_permission,
      dealer_uses_admin_slabs_only,
      allows_all_products,
      product_access_type,
      discount_percentage,
      distributor_margin_slab_min,
      distributor_margin_slab_max,
      pricing_tier,
      can_see_mrp,
      can_sell_direct,
      can_generate_quotes,
      lead_access_tier,
      leads_per_month,
      inventory_visibility,
      can_reserve_stock,
      stock_reservation_hours,
      min_order_value_paise: calculatedMinOrderPaise,
      credit_limit_paise: calculatedCreditLimitPaise,
      benefits: benefits.length > 0 ? benefits : [
        `${allowed_territories_count} ${territory_type} Exclusivity`,
        `Up to ${max_dealers} Dealer Accounts`,
        'Full BOS Component Whitelist',
        'Direct Manufacturer Warranty Dispatch',
        'Real-time Inventory Reservations',
      ],
      dashboard_modules: {
        overview: dashboard_modules.overview !== false,
        territories: dashboard_modules.territories !== false,
        catalogue: dashboard_modules.catalogue !== false,
        pricing: dashboard_modules.pricing !== false,
        inventory: dashboard_modules.inventory !== false,
        orders: dashboard_modules.orders !== false,
        customers: dashboard_modules.customers !== false,
        dealers: dashboard_modules.dealers !== false,
        dealer_onboarding: dashboard_modules.dealer_onboarding !== false,
        leads: dashboard_modules.leads !== false,
        sales_reports: dashboard_modules.sales_reports !== false,
        margin_reports: dashboard_modules.margin_reports !== false,
        documents: dashboard_modules.documents !== false,
        support: dashboard_modules.support !== false,
        subscriptions: dashboard_modules.subscriptions !== false,
      },
      is_popular,
      badge_text,
      sort_order,
      status,
      is_active: status === 'published',
      effective_from: effective_from || new Date(),
      effective_to: effective_to || null,
      current_version: 1,
      created_by: validAdminId,
    });

    // Create version snapshot if published
    if (status === 'published') {
      await BoskitPlanVersion.create({
        plan_id: plan._id,
        version_number: 1,
        snapshot: plan.toObject ? plan.toObject() : plan,
        published_by: validAdminId,
      });
    }

    logBoskitAudit({
      actor_type: 'cms_user',
      actor_id: validAdminId,
      action: 'DISTRIBUTOR_PLAN_CREATED',
      entity_type: 'boskit_distributor_plans',
      entity_id: plan._id,
      after_snapshot: { plan_code: plan.plan_code, name: plan.name, status: plan.status },
      req,
    });

    return res.status(201).json({
      status: 'success',
      success: true,
      message: 'Distributor plan created successfully.',
      plan,
      version: 1,
    });
  } catch (error) {
    console.error('[create_plan Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to create plan: ' + error.message,
    });
  }
};

/**
 * 9. Update Distributor Plan (Version-Safe)
 */
const update_plan = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id || 'admin_user';
    const validAdminId = mongoose.Types.ObjectId.isValid(adminId) ? adminId : null;

    const BoskitDistributorPlan = mongoose.model('boskit_distributor_plans');
    const BoskitPlanVersion = mongoose.model('boskit_plan_versions');

    const plan = await BoskitDistributorPlan.findById(id);
    if (!plan) {
      return res.status(404).json({
        status: 'error',
        success: false,
        message: 'Plan not found.',
      });
    }

    const updates = req.body;
    const wasPublished = plan.status === 'published';

    // Handle price conversion if INR provided
    if (updates.joining_fee_inr !== undefined) {
      updates.joining_fee_paise = Math.round(updates.joining_fee_inr * 100);
      delete updates.joining_fee_inr;
    }
    if (updates.renewal_fee_inr !== undefined) {
      updates.renewal_fee_paise = Math.round(updates.renewal_fee_inr * 100);
      delete updates.renewal_fee_inr;
    }
    if (updates.min_order_value_inr !== undefined) {
      updates.min_order_value_paise = Math.round(updates.min_order_value_inr * 100);
      delete updates.min_order_value_inr;
    }
    if (updates.credit_limit_inr !== undefined) {
      updates.credit_limit_paise = Math.round(updates.credit_limit_inr * 100);
      delete updates.credit_limit_inr;
    }

    if (updates.status === 'published') {
      updates.is_active = true;
    } else if (updates.status === 'unpublished' || updates.status === 'archived') {
      updates.is_active = false;
    }

    updates.updated_by = validAdminId;

    let newVersionCreated = false;
    let nextVersionNumber = plan.current_version || 1;

    // If already published and remaining published, create a new version snapshot
    if (wasPublished && updates.status !== 'draft') {
      nextVersionNumber += 1;
      updates.current_version = nextVersionNumber;
      newVersionCreated = true;
    }

    Object.assign(plan, updates);
    await plan.save();

    if (newVersionCreated || updates.status === 'published') {
      await BoskitPlanVersion.create({
        plan_id: plan._id,
        version_number: nextVersionNumber,
        snapshot: plan.toObject ? plan.toObject() : plan,
        published_by: validAdminId,
      });
    }

    logBoskitAudit({
      actor_type: 'cms_user',
      actor_id: validAdminId,
      action: 'DISTRIBUTOR_PLAN_UPDATED',
      entity_type: 'boskit_distributor_plans',
      entity_id: plan._id,
      after_snapshot: { version: nextVersionNumber, status: plan.status },
      req,
    });

    return res.status(200).json({
      status: 'success',
      success: true,
      message: `Plan updated successfully (Version ${nextVersionNumber}).`,
      plan,
      version: nextVersionNumber,
    });
  } catch (error) {
    console.error('[update_plan Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to update plan: ' + error.message,
    });
  }
};

/**
 * 10. Duplicate Plan (Clone as Draft)
 */
const duplicate_plan = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id || 'admin_user';
    const validAdminId = mongoose.Types.ObjectId.isValid(adminId) ? adminId : null;

    const BoskitDistributorPlan = mongoose.model('boskit_distributor_plans');
    const sourcePlan = await BoskitDistributorPlan.findById(id).lean();

    if (!sourcePlan) {
      return res.status(404).json({
        status: 'error',
        success: false,
        message: 'Source plan not found.',
      });
    }

    delete sourcePlan._id;
    delete sourcePlan.id;
    delete sourcePlan.created_at;
    delete sourcePlan.updated_at;

    const uniqueSuffix = Date.now().toString().slice(-4);
    sourcePlan.name = `${sourcePlan.name} (Copy)`;
    sourcePlan.plan_code = `${sourcePlan.plan_code}_COPY_${uniqueSuffix}`;
    sourcePlan.status = 'draft';
    sourcePlan.is_active = false;
    sourcePlan.is_popular = false;
    sourcePlan.current_version = 1;
    sourcePlan.created_by = validAdminId;

    const newPlan = await BoskitDistributorPlan.create(sourcePlan);

    logBoskitAudit({
      actor_type: 'cms_user',
      actor_id: validAdminId,
      action: 'DISTRIBUTOR_PLAN_DUPLICATED',
      entity_type: 'boskit_distributor_plans',
      entity_id: newPlan._id,
      after_snapshot: { original_id: id, new_code: newPlan.plan_code },
      req,
    });

    return res.status(201).json({
      status: 'success',
      success: true,
      message: 'Plan duplicated as draft.',
      plan: newPlan,
    });
  } catch (error) {
    console.error('[duplicate_plan Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to duplicate plan: ' + error.message,
    });
  }
};

/**
 * 11. Publish / Unpublish / Archive Plan
 */
const set_plan_status = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const adminId = req.user?.id || 'admin_user';
    const validAdminId = mongoose.Types.ObjectId.isValid(adminId) ? adminId : null;

    const validStatuses = ['draft', 'published', 'unpublished', 'archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: 'error',
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const BoskitDistributorPlan = mongoose.model('boskit_distributor_plans');
    const BoskitPlanVersion = mongoose.model('boskit_plan_versions');

    const plan = await BoskitDistributorPlan.findById(id);
    if (!plan) {
      return res.status(404).json({
        status: 'error',
        success: false,
        message: 'Plan not found.',
      });
    }

    plan.status = status;
    plan.is_active = status === 'published';
    plan.updated_by = validAdminId;

    if (status === 'published') {
      const currentVersion = plan.current_version || 1;
      const existingVersion = await BoskitPlanVersion.findOne({ plan_id: plan._id, version_number: currentVersion });
      if (!existingVersion) {
        await BoskitPlanVersion.create({
          plan_id: plan._id,
          version_number: currentVersion,
          snapshot: plan.toObject ? plan.toObject() : plan,
          published_by: validAdminId,
        });
      }
    }

    await plan.save();

    logBoskitAudit({
      actor_type: 'cms_user',
      actor_id: validAdminId,
      action: `DISTRIBUTOR_PLAN_${status.toUpperCase()}`,
      entity_type: 'boskit_distributor_plans',
      entity_id: plan._id,
      after_snapshot: { status: plan.status, is_active: plan.is_active },
      req,
    });

    return res.status(200).json({
      status: 'success',
      success: true,
      message: `Plan status updated to ${status}.`,
      plan,
    });
  } catch (error) {
    console.error('[set_plan_status Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to update plan status: ' + error.message,
    });
  }
};

/**
 * 12. Batch Reorder Plans
 */
const reorder_plans = async (req, res) => {
  try {
    const { ordered_ids } = req.body;
    if (!Array.isArray(ordered_ids) || ordered_ids.length === 0) {
      return res.status(400).json({
        status: 'error',
        success: false,
        message: 'ordered_ids array is required.',
      });
    }

    const BoskitDistributorPlan = mongoose.model('boskit_distributor_plans');
    const writeOps = ordered_ids.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { sort_order: index } },
      },
    }));

    await BoskitDistributorPlan.bulkWrite(writeOps);

    return res.status(200).json({
      status: 'success',
      success: true,
      message: 'Distributor plans reordered successfully.',
    });
  } catch (error) {
    console.error('[reorder_plans Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to reorder plans: ' + error.message,
    });
  }
};

/**
 * 13. Get Plan Version History
 */
const get_plan_versions = async (req, res) => {
  try {
    const { id } = req.params;
    const BoskitPlanVersion = mongoose.model('boskit_plan_versions');

    const versions = await BoskitPlanVersion.find({ plan_id: id })
      .populate('published_by', 'name email')
      .sort({ version_number: -1 })
      .lean();

    return res.status(200).json({
      status: 'success',
      success: true,
      versions,
    });
  } catch (error) {
    console.error('[get_plan_versions Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to fetch plan versions: ' + error.message,
    });
  }
};

/**
 * 14. Safe Migration of Distributors to a Target Plan Version
 */
const migrate_distributors_plan = async (req, res) => {
  try {
    const { distributor_ids, target_plan_id, target_version_number } = req.body;
    const adminId = req.user?.id || 'admin_user';
    const validAdminId = mongoose.Types.ObjectId.isValid(adminId) ? adminId : null;

    if (!Array.isArray(distributor_ids) || distributor_ids.length === 0 || !target_plan_id) {
      return res.status(400).json({
        status: 'error',
        success: false,
        message: 'distributor_ids array and target_plan_id are required.',
      });
    }

    const BoskitDistributor = mongoose.model('boskit_distributors');
    const BoskitDistributorPlan = mongoose.model('boskit_distributor_plans');
    const BoskitPlanVersion = mongoose.model('boskit_plan_versions');
    const BoskitDistributorPlanAssignment = mongoose.model('boskit_distributor_plan_assignments');
    const BoskitDealer = mongoose.model('boskit_dealers');

    const plan = await BoskitDistributorPlan.findById(target_plan_id);
    if (!plan) {
      return res.status(404).json({ status: 'error', success: false, message: 'Target plan not found.' });
    }

    let planVersion;
    if (target_version_number) {
      planVersion = await BoskitPlanVersion.findOne({ plan_id: target_plan_id, version_number: target_version_number });
    } else {
      planVersion = await BoskitPlanVersion.findOne({ plan_id: target_plan_id }).sort({ version_number: -1 });
    }

    if (!planVersion) {
      planVersion = await BoskitPlanVersion.create({
        plan_id: plan._id,
        version_number: plan.current_version || 1,
        snapshot: plan.toObject ? plan.toObject() : plan,
        published_by: validAdminId,
      });
    }

    const snapshot = planVersion.snapshot || (plan.toObject ? plan.toObject() : plan);
    const migrated = [];
    const blocked = [];

    for (const distId of distributor_ids) {
      const dist = await BoskitDistributor.findById(distId);
      if (!dist) continue;

      // Validate dealer counts if target plan has a stricter dealer cap
      const activeDealersCount = await BoskitDealer.countDocuments({ distributor_id: dist._id, activation_status: 'active' });
      if (snapshot.max_dealers && activeDealersCount > snapshot.max_dealers) {
        blocked.push({
          distributor_id: dist._id,
          business_name: dist.business_name,
          reason: `Distributor currently has ${activeDealersCount} active dealers, exceeding new plan limit of ${snapshot.max_dealers}.`,
        });
        continue;
      }

      // Expire previous assignment
      await BoskitDistributorPlanAssignment.updateMany(
        { distributor_id: dist._id, status: 'active' },
        { $set: { status: 'superseded' } }
      );

      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + (snapshot.validity_value || 12));

      const newAssignment = await BoskitDistributorPlanAssignment.create({
        distributor_id: dist._id,
        plan_id: plan._id,
        plan_version_id: planVersion._id,
        plan_snapshot: snapshot,
        assignment_type: 'migration',
        start_date: new Date(),
        expiry_date: expiresAt,
        amount_paid_paise: 0,
        currency: 'INR',
        status: 'active',
        assigned_by: validAdminId,
        notes: `Migrated by admin to ${plan.name} (v${planVersion.version_number})`,
      });

      dist.plan_assignment_id = newAssignment._id;
      await dist.save();

      migrated.push({
        distributor_id: dist._id,
        business_name: dist.business_name,
        new_assignment_id: newAssignment._id,
      });

      logBoskitAudit({
        actor_type: 'cms_user',
        actor_id: validAdminId,
        action: 'DISTRIBUTOR_PLAN_MIGRATED',
        entity_type: 'boskit_distributors',
        entity_id: dist._id,
        after_snapshot: { target_plan: plan.name, version: planVersion.version_number },
        req,
      });
    }

    return res.status(200).json({
      status: 'success',
      success: true,
      message: `Migration complete: ${migrated.length} migrated, ${blocked.length} blocked by limit constraints.`,
      migrated,
      blocked,
    });
  } catch (error) {
    console.error('[migrate_distributors_plan Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to migrate distributors: ' + error.message,
    });
  }
};

/**
 * 15. Get Territory Allocations & Conflicts Explorer
 */
const get_territory_allocations = async (req, res) => {
  try {
    const BoskitTerritory = mongoose.model('boskit_territories');

    const territories = await BoskitTerritory.find({ status: { $in: ['active', 'pending_validation'] } })
      .populate('distributor_id', 'business_name email mobile activation_status')
      .populate('state_id', 'name code')
      .populate('district_id', 'name')
      .sort({ created_at: -1 })
      .lean();

    return res.status(200).json({
      status: 'success',
      success: true,
      territories: territories.map((t) => ({
        id: t._id,
        distributor_id: t.distributor_id?._id,
        business_name: t.distributor_id?.business_name || 'N/A',
        email: t.distributor_id?.email || 'N/A',
        state: t.state_id?.name || t.state_name || 'All India',
        district: t.district_id?.name || t.district_name || 'Full State',
        is_exclusive: t.is_exclusive,
        status: t.status,
        assignment_source: t.assignment_source,
        override_reason: t.override_reason,
        created_at: t.created_at,
      })),
    });
  } catch (error) {
    console.error('[get_territory_allocations Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to fetch territory allocations: ' + error.message,
    });
  }
};

/**
 * 16. Admin Override Territory Conflict
 */
const override_territory_conflict = async (req, res) => {
  try {
    const { distributor_id, state_id, district_id, reason } = req.body;
    const adminId = req.user?.id || 'admin_user';
    const validAdminId = mongoose.Types.ObjectId.isValid(adminId) ? adminId : null;

    if (!distributor_id || !state_id || !reason) {
      return res.status(400).json({
        status: 'error',
        success: false,
        message: 'distributor_id, state_id, and mandatory override reason are required.',
      });
    }

    const BoskitTerritory = mongoose.model('boskit_territories');
    const BoskitDistributor = mongoose.model('boskit_distributors');

    const distributor = await BoskitDistributor.findById(distributor_id);
    if (!distributor) {
      return res.status(404).json({ status: 'error', success: false, message: 'Distributor not found.' });
    }

    const territory = await BoskitTerritory.create({
      distributor_id,
      state_id,
      district_id: district_id || null,
      is_exclusive: true,
      status: 'active',
      assignment_source: 'admin_override',
      override_reason: reason,
      assigned_by: validAdminId,
    });

    logBoskitAudit({
      actor_type: 'cms_user',
      actor_id: validAdminId,
      action: 'TERRITORY_CONFLICT_OVERRIDDEN',
      entity_type: 'boskit_territories',
      entity_id: territory._id,
      after_snapshot: { distributor_id, district_id, reason },
      req,
    });

    return res.status(200).json({
      status: 'success',
      success: true,
      message: 'Territory override granted successfully.',
      territory,
    });
  } catch (error) {
    console.error('[override_territory_conflict Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to override territory: ' + error.message,
    });
  }
};

/**
 * 17. Get Registered Dealers across All Distributors
 */
const get_dealers = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const BoskitDealer = mongoose.model('boskit_dealers');
    const query = {};

    if (status && status !== 'all') {
      query.activation_status = status;
    }

    const [total, dealers] = await Promise.all([
      BoskitDealer.countDocuments(query),
      BoskitDealer.find(query)
        .populate('distributor_id', 'business_name email mobile')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
    ]);

    let filtered = dealers;
    if (search) {
      const q = search.toLowerCase();
      filtered = dealers.filter((d) => (
        (d.business_name && d.business_name.toLowerCase().includes(q)) ||
        (d.email && d.email.toLowerCase().includes(q)) ||
        (d.mobile && d.mobile.includes(q)) ||
        (d.dealer_code && d.dealer_code.toLowerCase().includes(q))
      ));
    }

    return res.status(200).json({
      status: 'success',
      success: true,
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
      dealers: filtered.map((d) => ({
        id: d._id,
        dealer_code: d.dealer_code,
        business_name: d.business_name,
        email: d.email,
        mobile: d.mobile,
        distributor_name: d.distributor_id?.business_name || 'N/A',
        distributor_id: d.distributor_id?._id,
        activation_status: d.activation_status,
        created_at: d.created_at,
      })),
    });
  } catch (error) {
    console.error('[get_dealers Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to fetch dealers: ' + error.message,
    });
  }
};

/**
 * 18. Update Distributor Status (Suspend / Reactivate)
 */
const update_distributor_status = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const adminId = req.user?.id || 'admin_user';

    const validStatuses = ['active', 'suspended', 'terminated', 'deactivated'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: 'error',
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const BoskitDistributor = mongoose.model('boskit_distributors');
    const distributor = await BoskitDistributor.findById(id);

    if (!distributor) {
      return res.status(404).json({
        status: 'error',
        success: false,
        message: 'Distributor not found.',
      });
    }

    distributor.activation_status = status;
    distributor.is_active = status === 'active';
    await distributor.save();

    logBoskitAudit({
      actor_type: 'cms_user',
      actor_id: adminId,
      action: `DISTRIBUTOR_STATUS_${status.toUpperCase()}`,
      entity_type: 'boskit_distributors',
      entity_id: distributor._id,
      after_snapshot: { status, reason },
      req,
    });

    return res.status(200).json({
      status: 'success',
      success: true,
      message: `Distributor status updated to ${status}.`,
    });
  } catch (error) {
    console.error('[update_distributor_status Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to update distributor status: ' + error.message,
    });
  }
};

/**
 * ── CHANNEL SETTINGS CRUD ──────────────────────────────────────────────────
 */
const get_channel_settings = async (req, res) => {
  try {
    const { industry_id, state_id, district_id, distributor_id, status, page = 1, limit = 20 } = req.query;
    const BoskitChannelSettings = mongoose.model('boskit_channel_settings');
    const query = { deleted_at: null };

    if (industry_id && mongoose.Types.ObjectId.isValid(industry_id)) query.industry_type_id = industry_id;
    if (state_id && mongoose.Types.ObjectId.isValid(state_id)) query.state_id = state_id;
    if (district_id && mongoose.Types.ObjectId.isValid(district_id)) query.district_id = district_id;
    if (distributor_id && mongoose.Types.ObjectId.isValid(distributor_id)) query.distributor_id = distributor_id;
    if (status && status !== 'all') query.status = status;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [total, settings] = await Promise.all([
      BoskitChannelSettings.countDocuments(query),
      BoskitChannelSettings.find(query)
        .populate('industry_type_id', 'name')
        .populate('state_id', 'name')
        .populate('district_id', 'name')
        .populate('distributor_id', 'business_name gst_number')
        .populate('product_configs.product_id', 'name sku price')
        .sort({ rule_priority: 1, created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
    ]);

    return res.status(200).json({
      status: 'success',
      success: true,
      data: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        settings: settings.map((s) => ({
          id: s._id,
          industry: s.industry_type_id?.name || 'All Industries',
          state: s.state_id?.name || 'All States',
          district: s.district_id?.name || 'All Districts',
          distributor: s.distributor_id ? `${s.distributor_id.business_name} (${s.distributor_id.gst_number || 'N/A'})` : 'All Distributors',
          product_configs_count: s.product_configs?.length || 0,
          product_configs: s.product_configs || [],
          rule_priority: s.rule_priority || 100,
          effective_from: s.effective_from,
          effective_to: s.effective_to,
          status: s.status,
          created_at: s.created_at,
        })),
      },
    });
  } catch (error) {
    console.error('[get_channel_settings Error]:', error);
    return res.status(500).json({ status: 'error', success: false, message: 'Failed to fetch channel settings: ' + error.message });
  }
};

const create_channel_setting = async (req, res) => {
  try {
    const adminId = req.user?.id || req.user?._id;
    const {
      industry_type_id,
      project_type_id,
      state_id,
      district_id,
      distributor_id,
      product_configs = [],
      rule_priority = 100,
      effective_from = new Date(),
      effective_to = null,
      status = 'active',
    } = req.body;

    const BoskitChannelSettings = mongoose.model('boskit_channel_settings');

    const formattedConfigs = (product_configs || []).map((pc) => ({
      product_id: pc.product_id && mongoose.Types.ObjectId.isValid(pc.product_id) ? pc.product_id : null,
      kit_id: pc.kit_id && mongoose.Types.ObjectId.isValid(pc.kit_id) ? pc.kit_id : null,
      mrp_paise: Math.round(Number(pc.mrp_inr || pc.mrp_paise / 100 || 10000) * 100),
      distributor_rate_paise: Math.round(Number(pc.distributor_rate_inr || pc.distributor_rate_paise / 100 || 8500) * 100),
      gst_rate_pct: Number(pc.gst_rate_pct || 18),
      dealer_allowed: pc.dealer_allowed !== false,
      dealer_rate_paise: pc.dealer_rate_inr ? Math.round(Number(pc.dealer_rate_inr) * 100) : null,
      dealer_min_rate_paise: pc.dealer_min_rate_inr ? Math.round(Number(pc.dealer_min_rate_inr) * 100) : null,
      dealer_max_rate_paise: pc.dealer_max_rate_inr ? Math.round(Number(pc.dealer_max_rate_inr) * 100) : null,
      distributor_moq: Math.max(1, parseInt(pc.distributor_moq, 10) || 5),
      dealer_moq: Math.max(1, parseInt(pc.dealer_moq, 10) || 2),
    }));

    const [newSetting] = await BoskitChannelSettings.create([
      {
        industry_type_id: industry_type_id && mongoose.Types.ObjectId.isValid(industry_type_id) ? industry_type_id : null,
        project_type_id: project_type_id && mongoose.Types.ObjectId.isValid(project_type_id) ? project_type_id : null,
        state_id: state_id && mongoose.Types.ObjectId.isValid(state_id) ? state_id : null,
        district_id: district_id && mongoose.Types.ObjectId.isValid(district_id) ? district_id : null,
        distributor_id: distributor_id && mongoose.Types.ObjectId.isValid(distributor_id) ? distributor_id : null,
        product_configs: formattedConfigs,
        rule_priority: Number(rule_priority) || 100,
        effective_from,
        effective_to,
        status,
        created_by: adminId,
      },
    ]);

    logBoskitAudit({
      actor_type: 'cms_user',
      actor_id: adminId,
      action: 'CHANNEL_SETTING_CREATED',
      entity_type: 'boskit_channel_settings',
      entity_id: newSetting._id,
      req,
    });

    return res.status(201).json({
      status: 'success',
      success: true,
      message: 'Channel configuration created successfully.',
      data: newSetting,
    });
  } catch (error) {
    console.error('[create_channel_setting Error]:', error);
    return res.status(500).json({ status: 'error', success: false, message: 'Failed to create channel setting: ' + error.message });
  }
};

const update_channel_setting = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id || req.user?._id;
    const BoskitChannelSettings = mongoose.model('boskit_channel_settings');

    const setting = await BoskitChannelSettings.findById(id);
    if (!setting) {
      return res.status(404).json({ status: 'error', success: false, message: 'Channel setting not found.' });
    }

    const {
      industry_type_id,
      state_id,
      district_id,
      distributor_id,
      product_configs,
      rule_priority,
      effective_from,
      effective_to,
      status,
    } = req.body;

    if (industry_type_id !== undefined) setting.industry_type_id = industry_type_id || null;
    if (state_id !== undefined) setting.state_id = state_id || null;
    if (district_id !== undefined) setting.district_id = district_id || null;
    if (distributor_id !== undefined) setting.distributor_id = distributor_id || null;
    if (rule_priority !== undefined) setting.rule_priority = Number(rule_priority);
    if (effective_from !== undefined) setting.effective_from = effective_from;
    if (effective_to !== undefined) setting.effective_to = effective_to;
    if (status !== undefined) setting.status = status;
    setting.updated_by = adminId;

    if (Array.isArray(product_configs)) {
      setting.product_configs = product_configs.map((pc) => ({
        product_id: pc.product_id && mongoose.Types.ObjectId.isValid(pc.product_id) ? pc.product_id : null,
        kit_id: pc.kit_id && mongoose.Types.ObjectId.isValid(pc.kit_id) ? pc.kit_id : null,
        mrp_paise: Math.round(Number(pc.mrp_inr || pc.mrp_paise / 100 || 10000) * 100),
        distributor_rate_paise: Math.round(Number(pc.distributor_rate_inr || pc.distributor_rate_paise / 100 || 8500) * 100),
        gst_rate_pct: Number(pc.gst_rate_pct || 18),
        dealer_allowed: pc.dealer_allowed !== false,
        dealer_rate_paise: pc.dealer_rate_inr ? Math.round(Number(pc.dealer_rate_inr) * 100) : pc.dealer_rate_paise || null,
        dealer_min_rate_paise: pc.dealer_min_rate_inr ? Math.round(Number(pc.dealer_min_rate_inr) * 100) : pc.dealer_min_rate_paise || null,
        dealer_max_rate_paise: pc.dealer_max_rate_inr ? Math.round(Number(pc.dealer_max_rate_inr) * 100) : pc.dealer_max_rate_paise || null,
        distributor_moq: Math.max(1, parseInt(pc.distributor_moq, 10) || 5),
        dealer_moq: Math.max(1, parseInt(pc.dealer_moq, 10) || 2),
      }));
    }

    await setting.save();

    logBoskitAudit({
      actor_type: 'cms_user',
      actor_id: adminId,
      action: 'CHANNEL_SETTING_UPDATED',
      entity_type: 'boskit_channel_settings',
      entity_id: setting._id,
      req,
    });

    return res.status(200).json({ status: 'success', success: true, message: 'Channel setting updated.', data: setting });
  } catch (error) {
    console.error('[update_channel_setting Error]:', error);
    return res.status(500).json({ status: 'error', success: false, message: 'Failed to update channel setting: ' + error.message });
  }
};

const duplicate_channel_setting = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id || req.user?._id;
    const BoskitChannelSettings = mongoose.model('boskit_channel_settings');

    const source = await BoskitChannelSettings.findById(id).lean();
    if (!source) {
      return res.status(404).json({ status: 'error', success: false, message: 'Channel setting not found.' });
    }

    const { _id, id: _, created_at, updated_at, ...rest } = source;
    const cloned = await BoskitChannelSettings.create({
      ...rest,
      status: 'draft',
      rule_priority: (source.rule_priority || 100) + 1,
      created_by: adminId,
    });

    return res.status(201).json({ status: 'success', success: true, message: 'Channel setting duplicated as draft.', data: cloned });
  } catch (error) {
    console.error('[duplicate_channel_setting Error]:', error);
    return res.status(500).json({ status: 'error', success: false, message: 'Failed to duplicate channel setting: ' + error.message });
  }
};

const delete_channel_setting = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id || req.user?._id;
    const BoskitChannelSettings = mongoose.model('boskit_channel_settings');

    await BoskitChannelSettings.findByIdAndUpdate(id, { deleted_at: new Date(), status: 'inactive' });

    logBoskitAudit({
      actor_type: 'cms_user',
      actor_id: adminId,
      action: 'CHANNEL_SETTING_DELETED',
      entity_type: 'boskit_channel_settings',
      entity_id: id,
      req,
    });

    return res.status(200).json({ status: 'success', success: true, message: 'Channel setting deleted.' });
  } catch (error) {
    console.error('[delete_channel_setting Error]:', error);
    return res.status(500).json({ status: 'error', success: false, message: 'Failed to delete channel setting: ' + error.message });
  }
};

/**
 * ── PRODUCTS & CATEGORIES ADMIN ────────────────────────────────────────────
 */
const get_admin_products = async (req, res) => {
  try {
    const { search, category_id, status, page = 1, limit = 20 } = req.query;
    const Product = mongoose.model('products');
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }
    if (category_id && mongoose.Types.ObjectId.isValid(category_id)) query.category_id = category_id;
    if (status === 'active') query.is_active = true;
    if (status === 'inactive') query.is_active = false;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [total, products] = await Promise.all([
      Product.countDocuments(query),
      Product.find(query).sort({ created_at: -1 }).skip(skip).limit(parseInt(limit, 10)).lean(),
    ]);

    return res.status(200).json({
      status: 'success',
      success: true,
      data: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        products: products.map((p) => ({
          id: p._id,
          name: p.name,
          sku: p.sku || `BK-SKU-${p._id.toString().slice(-4)}`,
          category_id: p.category_id,
          price: p.price || (p.mrp_paise ? p.mrp_paise / 100 : 0),
          mrp_paise: p.mrp_paise || (p.price ? p.price * 100 : 0),
          mrp_inr: Math.round((p.mrp_paise || (p.price ? p.price * 100 : 0)) / 100),
          distributor_rate_inr: Math.round(((p.mrp_paise || p.price * 100 || 0) * 0.85) / 100),
          dealer_rate_inr: Math.round(((p.mrp_paise || p.price * 100 || 0) * 0.90) / 100),
          tax_percent: p.tax_percent || p.gst_rate || 18,
          min_order_qty: p.min_order_qty || 1,
          is_active: p.is_active !== false,
          image: p.image || p.thumbnail_url || null,
          created_at: p.created_at,
        })),
      },
    });
  } catch (error) {
    console.error('[get_admin_products Error]:', error);
    return res.status(500).json({ status: 'error', success: false, message: 'Failed to fetch products: ' + error.message });
  }
};

const update_product_pricing = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id || req.user?._id;
    const { mrp_inr, tax_percent, min_order_qty, is_active } = req.body;

    const Product = mongoose.model('products');
    const update = {};
    if (mrp_inr !== undefined) {
      update.price = Number(mrp_inr);
      update.mrp_paise = Math.round(Number(mrp_inr) * 100);
    }
    if (tax_percent !== undefined) update.tax_percent = Number(tax_percent);
    if (min_order_qty !== undefined) update.min_order_qty = Number(min_order_qty);
    if (is_active !== undefined) update.is_active = is_active;

    const updated = await Product.findByIdAndUpdate(id, update, { new: true });

    logBoskitAudit({
      actor_type: 'cms_user',
      actor_id: adminId,
      action: 'PRODUCT_PRICING_UPDATED',
      entity_type: 'products',
      entity_id: id,
      after_snapshot: update,
      req,
    });

    return res.status(200).json({ status: 'success', success: true, message: 'Product pricing updated.', data: updated });
  } catch (error) {
    console.error('[update_product_pricing Error]:', error);
    return res.status(500).json({ status: 'error', success: false, message: 'Failed to update product pricing: ' + error.message });
  }
};

const get_admin_categories = async (req, res) => {
  try {
    const Category = mongoose.models['categories'] || mongoose.model('product_templates', new mongoose.Schema({}, { strict: false }));
    const categories = await Category.find().limit(50).lean().catch(() => []);

    return res.status(200).json({
      status: 'success',
      success: true,
      data: {
        categories: categories.map((c) => ({
          id: c._id,
          name: c.name || c.title || 'Solar Category',
          slug: c.slug || c.name?.toLowerCase().replace(/\s+/g, '-'),
          products_count: 12,
        })),
      },
    });
  } catch (error) {
    console.error('[get_admin_categories Error]:', error);
    return res.status(500).json({ status: 'error', success: false, message: 'Failed to fetch categories: ' + error.message });
  }
};

/**
 * ── MOQ RULES CRUD ─────────────────────────────────────────────────────────
 */
const get_moq_rules = async (req, res) => {
  try {
    const BoskitMoqRule = mongoose.model('boskit_moq_rules');
    const rules = await BoskitMoqRule.find()
      .populate('product_id', 'name sku price')
      .populate('distributor_id', 'business_name')
      .sort({ created_at: -1 })
      .lean();

    return res.status(200).json({
      status: 'success',
      success: true,
      data: {
        total: rules.length,
        rules: rules.map((r) => ({
          id: r._id,
          rule_name: r.rule_name,
          scope: r.scope,
          channel: r.channel || 'All Channels',
          product_name: r.product_id?.name || 'All Products',
          distributor_name: r.distributor_id?.business_name || 'All Distributors',
          moq: r.moq,
          status: r.status,
          effective_from: r.effective_from,
          effective_to: r.effective_to,
        })),
      },
    });
  } catch (error) {
    console.error('[get_moq_rules Error]:', error);
    return res.status(500).json({ status: 'error', success: false, message: 'Failed to fetch MOQ rules: ' + error.message });
  }
};

const create_moq_rule = async (req, res) => {
  try {
    const adminId = req.user?.id || req.user?._id;
    const { rule_name, scope = 'product_default', channel, product_id, distributor_id, moq = 1, status = 'active' } = req.body;

    const BoskitMoqRule = mongoose.model('boskit_moq_rules');
    const [rule] = await BoskitMoqRule.create([
      {
        rule_name: rule_name || `MOQ-${moq} Units`,
        scope,
        channel: channel || null,
        product_id: product_id && mongoose.Types.ObjectId.isValid(product_id) ? product_id : null,
        distributor_id: distributor_id && mongoose.Types.ObjectId.isValid(distributor_id) ? distributor_id : null,
        moq: Number(moq) || 1,
        status,
        created_by: adminId,
      },
    ]);

    return res.status(201).json({ status: 'success', success: true, message: 'MOQ rule created.', data: rule });
  } catch (error) {
    console.error('[create_moq_rule Error]:', error);
    return res.status(500).json({ status: 'error', success: false, message: 'Failed to create MOQ rule: ' + error.message });
  }
};

const update_moq_rule = async (req, res) => {
  try {
    const { id } = req.params;
    const BoskitMoqRule = mongoose.model('boskit_moq_rules');
    const updated = await BoskitMoqRule.findByIdAndUpdate(id, req.body, { new: true });
    return res.status(200).json({ status: 'success', success: true, message: 'MOQ rule updated.', data: updated });
  } catch (error) {
    console.error('[update_moq_rule Error]:', error);
    return res.status(500).json({ status: 'error', success: false, message: 'Failed to update MOQ rule: ' + error.message });
  }
};

const delete_moq_rule = async (req, res) => {
  try {
    const { id } = req.params;
    const BoskitMoqRule = mongoose.model('boskit_moq_rules');
    await BoskitMoqRule.findByIdAndDelete(id);
    return res.status(200).json({ status: 'success', success: true, message: 'MOQ rule deleted.' });
  } catch (error) {
    console.error('[delete_moq_rule Error]:', error);
    return res.status(500).json({ status: 'error', success: false, message: 'Failed to delete MOQ rule: ' + error.message });
  }
};

/**
 * ── GST / TAX RULES CRUD ───────────────────────────────────────────────────
 */
const get_tax_rules = async (req, res) => {
  try {
    const BoskitTaxRule = mongoose.model('boskit_tax_rules');
    const rules = await BoskitTaxRule.find().populate('product_id', 'name sku').sort({ priority: 1 }).lean();

    return res.status(200).json({
      status: 'success',
      success: true,
      data: {
        total: rules.length,
        rules: rules.map((r) => ({
          id: r._id,
          rule_name: r.rule_name,
          scope: r.scope,
          product_name: r.product_id?.name || 'Global / Category',
          total_gst_pct: r.total_gst_pct,
          cgst_pct: r.cgst_pct || r.total_gst_pct / 2,
          sgst_pct: r.sgst_pct || r.total_gst_pct / 2,
          igst_pct: r.igst_pct || r.total_gst_pct,
          hsn_code: r.hsn_code || '998399',
          status: r.status,
        })),
      },
    });
  } catch (error) {
    console.error('[get_tax_rules Error]:', error);
    return res.status(500).json({ status: 'error', success: false, message: 'Failed to fetch tax rules: ' + error.message });
  }
};

const create_tax_rule = async (req, res) => {
  try {
    const adminId = req.user?.id || req.user?._id;
    const { rule_name, scope = 'product', product_id, total_gst_pct = 18, hsn_code = '998399', status = 'active' } = req.body;

    const BoskitTaxRule = mongoose.model('boskit_tax_rules');
    const [rule] = await BoskitTaxRule.create([
      {
        rule_name: rule_name || `GST ${total_gst_pct}% Rule`,
        scope,
        product_id: product_id && mongoose.Types.ObjectId.isValid(product_id) ? product_id : null,
        total_gst_pct: Number(total_gst_pct) || 18,
        cgst_pct: Number(total_gst_pct) / 2,
        sgst_pct: Number(total_gst_pct) / 2,
        igst_pct: Number(total_gst_pct),
        hsn_code,
        status,
        created_by: adminId,
      },
    ]);

    return res.status(201).json({ status: 'success', success: true, message: 'Tax rule created.', data: rule });
  } catch (error) {
    console.error('[create_tax_rule Error]:', error);
    return res.status(500).json({ status: 'error', success: false, message: 'Failed to create tax rule: ' + error.message });
  }
};

const update_tax_rule = async (req, res) => {
  try {
    const { id } = req.params;
    const BoskitTaxRule = mongoose.model('boskit_tax_rules');
    const updated = await BoskitTaxRule.findByIdAndUpdate(id, req.body, { new: true });
    return res.status(200).json({ status: 'success', success: true, message: 'Tax rule updated.', data: updated });
  } catch (error) {
    console.error('[update_tax_rule Error]:', error);
    return res.status(500).json({ status: 'error', success: false, message: 'Failed to update tax rule: ' + error.message });
  }
};

const delete_tax_rule = async (req, res) => {
  try {
    const { id } = req.params;
    const BoskitTaxRule = mongoose.model('boskit_tax_rules');
    await BoskitTaxRule.findByIdAndDelete(id);
    return res.status(200).json({ status: 'success', success: true, message: 'Tax rule deleted.' });
  } catch (error) {
    console.error('[delete_tax_rule Error]:', error);
    return res.status(500).json({ status: 'error', success: false, message: 'Failed to delete tax rule: ' + error.message });
  }
};

/**
 * ── TERRITORY SETTINGS CRUD ────────────────────────────────────────────────
 */
const get_admin_territories = async (req, res) => {
  try {
    const BoskitTerritory = mongoose.model('boskit_territories');
    const territories = await BoskitTerritory.find()
      .populate('distributor_id', 'business_name mobile email gst_number')
      .populate('state_id', 'name')
      .populate('district_id', 'name')
      .sort({ created_at: -1 })
      .lean();

    return res.status(200).json({
      status: 'success',
      success: true,
      data: {
        total: territories.length,
        territories: territories.map((t) => ({
          id: t._id,
          distributor_name: t.distributor_id?.business_name || 'Unassigned',
          distributor_gst: t.distributor_id?.gst_number || 'N/A',
          state: t.state_name || t.state_id?.name || 'N/A',
          district: t.district_name || t.district_id?.name || 'All Districts',
          is_exclusive: t.is_exclusive !== false,
          status: t.status || 'active',
          assignment_source: t.assignment_source || 'admin_assigned',
          created_at: t.created_at,
        })),
      },
    });
  } catch (error) {
    console.error('[get_admin_territories Error]:', error);
    return res.status(500).json({ status: 'error', success: false, message: 'Failed to fetch territories: ' + error.message });
  }
};

const assign_territory = async (req, res) => {
  try {
    const adminId = req.user?.id || req.user?._id;
    const { distributor_id, state_id, district_id, state_name, district_name, is_exclusive = true } = req.body;

    const BoskitTerritory = mongoose.model('boskit_territories');
    const [territory] = await BoskitTerritory.create([
      {
        distributor_id,
        state_id: state_id && mongoose.Types.ObjectId.isValid(state_id) ? state_id : new mongoose.Types.ObjectId(),
        district_id: district_id && mongoose.Types.ObjectId.isValid(district_id) ? district_id : null,
        state_name,
        district_name,
        is_exclusive,
        status: 'active',
        assignment_source: 'admin_assigned',
        assigned_by: adminId,
      },
    ]);

    return res.status(201).json({ status: 'success', success: true, message: 'Territory assigned.', data: territory });
  } catch (error) {
    console.error('[assign_territory Error]:', error);
    return res.status(500).json({ status: 'error', success: false, message: 'Failed to assign territory: ' + error.message });
  }
};

/**
 * ── ORDERS MANAGEMENT ADMIN ────────────────────────────────────────────────
 */
const get_admin_orders = async (req, res) => {
  try {
    const { status, buyer_type, search, page = 1, limit = 20 } = req.query;
    const BoskitOrder = mongoose.model('boskit_orders');
    const query = {};

    if (status && status !== 'all') query.order_status = status;
    if (buyer_type && buyer_type !== 'all') query.buyer_type = buyer_type;
    if (search) {
      query.$or = [
        { order_number: { $regex: search, $options: 'i' } },
        { billing_name: { $regex: search, $options: 'i' } },
        { billing_gst_number: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [total, orders] = await Promise.all([
      BoskitOrder.countDocuments(query),
      BoskitOrder.find(query).sort({ created_at: -1 }).skip(skip).limit(parseInt(limit, 10)).lean(),
    ]);

    return res.status(200).json({
      status: 'success',
      success: true,
      data: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        orders: orders.map((o) => ({
          id: o._id,
          order_number: o.order_number,
          buyer_type: o.buyer_type,
          billing_name: o.billing_name || 'N/A',
          billing_gst: o.billing_gst_number || 'N/A',
          items_count: o.items?.length || 0,
          grand_total_inr: Math.round((o.grand_total_paise || 0) / 100),
          order_status: o.order_status,
          payment_status: o.payment_status || 'pending',
          created_at: o.created_at,
        })),
      },
    });
  } catch (error) {
    console.error('[get_admin_orders Error]:', error);
    return res.status(500).json({ status: 'error', success: false, message: 'Failed to fetch orders: ' + error.message });
  }
};

const get_admin_order_detail = async (req, res) => {
  try {
    const { id } = req.params;
    const BoskitOrder = mongoose.model('boskit_orders');
    const order = await BoskitOrder.findById(id).lean();

    if (!order) {
      return res.status(404).json({ status: 'error', success: false, message: 'Order not found.' });
    }

    return res.status(200).json({ status: 'success', success: true, data: order });
  } catch (error) {
    console.error('[get_admin_order_detail Error]:', error);
    return res.status(500).json({ status: 'error', success: false, message: 'Failed to fetch order detail: ' + error.message });
  }
};

const update_order_status = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id || req.user?._id;
    const { status, comment } = req.body;

    const allowedTransitions = ['new', 'confirmed', 'processing', 'packed', 'out_for_delivery', 'delivered', 'cancelled'];
    if (!allowedTransitions.includes(status)) {
      return res.status(400).json({ status: 'error', success: false, message: 'Invalid order status: ' + status });
    }

    const BoskitOrder = mongoose.model('boskit_orders');
    const order = await BoskitOrder.findById(id);
    if (!order) {
      return res.status(404).json({ status: 'error', success: false, message: 'Order not found.' });
    }

    order.order_status = status;
    order.status_history.push({
      status,
      actor_type: 'cms_user',
      actor_id: adminId,
      comment: comment || `Status moved to ${status}`,
      timestamp: new Date(),
    });

    if (status === 'confirmed') order.confirmed_at = new Date();
    if (status === 'out_for_delivery') order.dispatched_at = new Date();
    if (status === 'delivered') order.delivered_at = new Date();

    await order.save();

    logBoskitAudit({
      actor_type: 'cms_user',
      actor_id: adminId,
      action: `ORDER_STATUS_${status.toUpperCase()}`,
      entity_type: 'boskit_orders',
      entity_id: order._id,
      req,
    });

    return res.status(200).json({ status: 'success', success: true, message: `Order status updated to ${status}.`, data: order });
  } catch (error) {
    console.error('[update_order_status Error]:', error);
    return res.status(500).json({ status: 'error', success: false, message: 'Failed to update order status: ' + error.message });
  }
};

/**
 * ── PAYMENTS ADMIN ─────────────────────────────────────────────────────────
 */
const get_admin_payments = async (req, res) => {
  try {
    const BoskitOrder = mongoose.model('boskit_orders');
    const orders = await BoskitOrder.find().sort({ created_at: -1 }).limit(100).lean();

    return res.status(200).json({
      status: 'success',
      success: true,
      data: {
        total: orders.length,
        payments: orders.map((o) => ({
          id: o._id,
          order_number: o.order_number,
          buyer_type: o.buyer_type,
          billing_name: o.billing_name,
          amount_inr: Math.round((o.grand_total_paise || 0) / 100),
          payment_status: o.payment_status || 'captured',
          gateway: 'Razorpay Enterprise B2B',
          transaction_ref: o.razorpay_order_id || `TXN-${o._id.toString().slice(-6)}`,
          created_at: o.created_at,
        })),
      },
    });
  } catch (error) {
    console.error('[get_admin_payments Error]:', error);
    return res.status(500).json({ status: 'error', success: false, message: 'Failed to fetch payments: ' + error.message });
  }
};

module.exports = {
  get_admin_stats,
  get_distributor_applications,
  get_distributor_application_detail,
  review_distributor_application,
  activate_distributor_account,
  get_distributors,
  get_plans,
  create_plan,
  update_plan,
  duplicate_plan,
  set_plan_status,
  reorder_plans,
  get_plan_versions,
  migrate_distributors_plan,
  get_territory_allocations,
  override_territory_conflict,
  get_dealers,
  update_distributor_status,
  // New Handlers
  get_channel_settings,
  create_channel_setting,
  update_channel_setting,
  duplicate_channel_setting,
  delete_channel_setting,
  get_admin_products,
  update_product_pricing,
  get_admin_categories,
  get_moq_rules,
  create_moq_rule,
  update_moq_rule,
  delete_moq_rule,
  get_tax_rules,
  create_tax_rule,
  update_tax_rule,
  delete_tax_rule,
  get_admin_territories,
  assign_territory,
  get_admin_orders,
  get_admin_order_detail,
  update_order_status,
  get_admin_payments,
};

