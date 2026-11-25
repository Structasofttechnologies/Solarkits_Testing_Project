/**
 * reseller.prodauth.handler.js
 *
 * Admin controller for Reseller Product Authorization Matrix & District Product Rules.
 * Phase 4 — Reseller Management System
 * Phase R5 — District Product Rules, Scoped Authorization & Precedence Hierarchy.
 *
 * Pattern: { status: "success"|"error", data, message }
 */

const mongoose = require('mongoose');
const { Reseller, ResellerProductAuthorization, DistrictProductRule, WarehouseComboKit, ResellerListing } = require('../models/india_solarshop_db');
const { ProjectCategory, ProjectSubcategory, Product, IndustryType } = require('../models/core_db');
const { CmsUser } = require('../models/user_db');
const { evaluateResellerProductAuthorization } = require('../utils/product.authorization.service');
const { logAudit } = require('../utils/audit.service');

// ─── 1. LIST PRODUCT AUTHORIZATIONS FOR RESELLER ──────────────────────────────
/**
 * GET /admin-api/reseller-mgmt/product-auth/list/:id
 */
const list_product_authorizations = async (req, res) => {
  try {
    const { id } = req.params;
    const isAll = !id || id === 'all';
    if (!isAll && !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Valid reseller ID is required' });
    }

    const query = isAll ? {} : { reseller_id: id };

    const rows = await ResellerProductAuthorization.find(query)
      .populate({ path: 'reseller_id', model: Reseller, select: 'business_name email mobile city address commercial_mode activation_status' })
      .populate({ path: 'category_id', model: ProjectCategory, select: 'name' })
      .populate({ path: 'subcategory_id', model: ProjectSubcategory, select: 'name' })
      .populate({ path: 'product_id', model: Product, select: 'name sku_code stock_quantity image base_price_paise' })
      .populate({ path: 'kit_id', model: WarehouseComboKit, select: 'name kit_name kit_code kit_image base_price_cached selling_price_cached' })
      .populate({ path: 'allowed_industry_type_ids', model: IndustryType, select: 'name' })
      .populate({ path: 'assigned_by', model: CmsUser, select: 'name email' })
      .sort({ created_at: -1 })
      .lean();

    const listings = await ResellerListing.find(isAll ? {} : { reseller_id: id }).lean();
    const listingStockMap = {};
    listings.forEach((l) => {
      const resId = l.reseller_id?.toString() || '';
      const prodId = l.product_id?.toString() || '';
      const kitId = l.kit_id?.toString() || '';
      if (resId && prodId) listingStockMap[`${resId}_${prodId}`] = l.stock_quantity;
      if (resId && kitId) listingStockMap[`${resId}_${kitId}`] = l.stock_quantity;
      if (prodId) listingStockMap[prodId] = l.stock_quantity;
      if (kitId) listingStockMap[kitId] = l.stock_quantity;
    });

    const data = rows.map((r) => {
      const resObj = r.reseller_id && typeof r.reseller_id === 'object' ? r.reseller_id : null;
      const resIdStr = resObj?._id ? resObj._id.toString() : (r.reseller_id ? r.reseller_id.toString() : '');
      const pId = r.product_id?._id ? r.product_id._id.toString() : (r.product_id ? r.product_id.toString() : null);
      const kId = r.kit_id?._id ? r.kit_id._id.toString() : (r.kit_id ? r.kit_id.toString() : null);

      let stockQty = 100;
      if (resIdStr && pId && listingStockMap[`${resIdStr}_${pId}`] !== undefined) {
        stockQty = listingStockMap[`${resIdStr}_${pId}`];
      } else if (resIdStr && kId && listingStockMap[`${resIdStr}_${kId}`] !== undefined) {
        stockQty = listingStockMap[`${resIdStr}_${kId}`];
      } else if (pId && listingStockMap[pId] !== undefined) {
        stockQty = listingStockMap[pId];
      } else if (kId && listingStockMap[kId] !== undefined) {
        stockQty = listingStockMap[kId];
      } else if (r.product_id?.stock_quantity !== undefined) {
        stockQty = r.product_id.stock_quantity;
      }

      return {
        id:                       r._id,
        reseller_id:              resIdStr,
        reseller:                 resObj,
        district_id:             r.district_id,
        scope_type:               r.scope_type,
        category:                 r.category_id,
        subcategory:              r.subcategory_id,
        product:                  r.product_id,
        kit:                      r.kit_id,
        stock_quantity:           stockQty,
        allowed_project_type_ids: r.allowed_project_type_ids,
        allowed_industry_type_ids:r.allowed_industry_type_ids,
        is_authorized:            r.is_authorized,
        source:                   r.source,
        override_reason:          r.override_reason,
        assigned_by:              r.assigned_by,
        effective_date:           r.effective_date,
        status:                   r.status,
        created_at:               r.created_at,
      };
    });

    return res.json({ status: 'success', data });
  } catch (error) {
    console.error('[reseller.prodauth] list_product_authorizations error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 2. ASSIGN PRODUCT AUTHORIZATION RULE ─────────────────────────────────────
/**
 * POST /admin-api/reseller-mgmt/product-auth/assign/:id
 * Body: { scope_type, category_id?, subcategory_id?, product_id?, kit_id?, district_id?, allowed_project_type_ids?, allowed_industry_type_ids?, is_authorized?, override_reason? }
 */
const assign_product_authorization = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      scope_type,
      category_id,
      subcategory_id,
      product_id,
      kit_id,
      district_id,
      allowed_project_type_ids,
      allowed_industry_type_ids,
      is_authorized,
      override_reason,
    } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Valid reseller ID is required' });
    }

    if (!scope_type || !['all', 'category', 'subcategory', 'product', 'kit'].includes(scope_type)) {
      return res.status(400).json({ status: 'error', message: 'scope_type must be all, category, subcategory, product, or kit' });
    }

    if (scope_type === 'category' && !category_id) {
      return res.status(400).json({ status: 'error', message: 'category_id required for category scope' });
    }
    if (scope_type === 'subcategory' && !subcategory_id) {
      return res.status(400).json({ status: 'error', message: 'subcategory_id required for subcategory scope' });
    }
    if (scope_type === 'product' && !product_id) {
      return res.status(400).json({ status: 'error', message: 'product_id required for product scope' });
    }
    if (scope_type === 'kit' && !kit_id) {
      return res.status(400).json({ status: 'error', message: 'kit_id required for kit scope' });
    }

    const reseller = await Reseller.findOne({ _id: id, deleted_at: null });
    if (!reseller) return res.status(404).json({ status: 'error', message: 'Reseller not found' });

    // ── 1. Industry Eligibility Check ───────────────────────────────────────
    let productObj = null;
    let targetIndustryId = allowed_industry_type_ids?.[0] || null;

    if (scope_type === 'product' && product_id) {
      productObj = await Product.findById(product_id).lean();
      if (!productObj) return res.status(404).json({ status: 'error', message: 'Product not found' });
      if (productObj.industry_type_id) {
        targetIndustryId = (productObj.industry_type_id._id || productObj.industry_type_id).toString();
      }
    }

    if (reseller.approved_industry_type_ids && reseller.approved_industry_type_ids.length > 0 && targetIndustryId) {
      const isApproved = reseller.approved_industry_type_ids.some(
        (approvedId) => (approvedId._id || approvedId).toString() === targetIndustryId.toString()
      );
      if (!isApproved) {
        return res.status(400).json({
          status: 'error',
          message: `Product industry type does not match reseller's approved industry type.`,
        });
      }
    }

    // ── 2. Create or Update Authorization Rule ──────────────────────────────
    const filter = {
      reseller_id: id,
      scope_type,
      status: 'active',
    };
    if (scope_type === 'category') filter.category_id = category_id;
    if (scope_type === 'subcategory') filter.subcategory_id = subcategory_id;
    if (scope_type === 'product') filter.product_id = product_id;
    if (scope_type === 'kit') filter.kit_id = kit_id;

    let rule = await ResellerProductAuthorization.findOne(filter);

    if (rule) {
      rule.is_authorized = is_authorized !== undefined ? Boolean(is_authorized) : true;
      if (override_reason !== undefined) rule.override_reason = override_reason ? override_reason.trim() : null;
      if (allowed_industry_type_ids) rule.allowed_industry_type_ids = allowed_industry_type_ids;
      if (allowed_project_type_ids) rule.allowed_project_type_ids = allowed_project_type_ids;
      if (category_id && scope_type !== 'category') rule.category_id = category_id;
      if (subcategory_id && scope_type !== 'subcategory') rule.subcategory_id = subcategory_id;
      rule.assigned_by = req.user?.id || rule.assigned_by;
      await rule.save();
    } else {
      rule = await ResellerProductAuthorization.create({
        reseller_id:              id,
        district_id:              district_id || null,
        scope_type,
        category_id:             category_id || null,
        subcategory_id:          subcategory_id || null,
        product_id:              product_id || null,
        kit_id:                  kit_id || null,
        allowed_project_type_ids: allowed_project_type_ids || [],
        allowed_industry_type_ids:allowed_industry_type_ids || [],
        is_authorized:           is_authorized !== undefined ? Boolean(is_authorized) : true,
        source:                  'admin_override',
        assigned_by:             req.user?.id || null,
        override_reason:         override_reason ? override_reason.trim() : null,
        status:                  'active',
      });
    }

    // ── 3. Upsert ResellerListing ───────────────────────────────────────────
    let listing = null;
    const targetIsAuthorized = is_authorized !== undefined ? Boolean(is_authorized) : true;

    if (scope_type === 'product' && product_id) {
      if (!productObj) productObj = await Product.findById(product_id).lean();
      
      const existingListing = await ResellerListing.findOne({
        reseller_id: id,
        item_type: 'product',
        product_id,
      });

      if (existingListing) {
        existingListing.assignment_status = targetIsAuthorized ? 'assigned' : 'revoked';
        await existingListing.save();
        listing = existingListing;
      } else if (targetIsAuthorized && productObj) {
        const costPricePaise = productObj.base_price_paise || 100000;
        const minMarginPaise = productObj.min_margin_paise || 0;
        const maxMarginPaise = productObj.max_margin_paise || 5000000;
        const taxRate = productObj.tax_rate_pct || 18;

        listing = await ResellerListing.create({
          reseller_id: id,
          item_type: 'product',
          product_id,
          industry_type_id: productObj.industry_type_id || targetIndustryId || null,
          category_id: productObj.category_id || category_id || null,
          subcategory_id: productObj.subcategory_id || subcategory_id || null,
          brand_id: productObj.brand_id || null,
          title: productObj.name,
          description: productObj.description,
          image_url: productObj.image,
          specifications: productObj.specifications || {},
          stock_quantity: productObj.stock_quantity || 100,
          cost_price_paise: costPricePaise,
          map_price_paise: costPricePaise,
          min_margin_paise: minMarginPaise,
          max_margin_paise: maxMarginPaise,
          reseller_margin_paise: 0,
          reseller_margin_pct: 0,
          tax_rate_pct: taxRate,
          taxes_and_charges_paise: 0,
          selling_price_paise: costPricePaise,
          assignment_status: 'assigned',
          assigned_by: req.user?.id || null,
          assigned_at: new Date(),
          audit_history: [
            {
              status: 'assigned',
              actor_type: 'cms_user',
              actor_id: req.user?.id || null,
              notes: 'Product assigned to reseller by Super Admin',
              timestamp: new Date(),
            },
          ],
        });
      }
    } else if (scope_type === 'kit' && kit_id) {
      // Load kit details
      const kitObj = await WarehouseComboKit.findById(kit_id).lean();

      const existingListing = await ResellerListing.findOne({
        reseller_id: id,
        item_type: 'kit',
        kit_id,
      });

      if (existingListing) {
        existingListing.assignment_status = targetIsAuthorized ? 'assigned' : 'revoked';
        await existingListing.save();
        listing = existingListing;
      } else if (targetIsAuthorized && kitObj) {
        // Bug fix: Create listing for kit if it doesn't exist yet
        const kitCostPaise = kitObj.base_price_cached
          ? Math.round(kitObj.base_price_cached * 100)
          : (kitObj.selling_price_cached ? Math.round(kitObj.selling_price_cached * 100) : 100000);

        listing = await ResellerListing.create({
          reseller_id:      id,
          item_type:        'kit',
          kit_id,
          title:            kitObj.name,            // schema field is 'name', not 'kit_name'
          description:      kitObj.description || null,
          image_url:        kitObj.kit_image || null,
          stock_quantity:   100,
          cost_price_paise:    kitCostPaise,
          map_price_paise:     kitCostPaise,
          selling_price_paise: kitCostPaise,
          min_margin_paise:    0,
          max_margin_paise:    500000000,
          reseller_margin_paise: 0,
          tax_rate_pct:     18,
          taxes_and_charges_paise: 0,
          assignment_status: 'assigned',
          assigned_by:      req.user?.id || null,
          assigned_at:      new Date(),
          audit_history: [{
            status:     'assigned',
            actor_type: 'cms_user',
            actor_id:   req.user?.id || null,
            notes:      'Combo kit assigned to franchise partner by Super Admin',
            timestamp:  new Date(),
          }],
        });
      }
    }

    await logAudit({
      actor_type: 'cms_user',
      actor_id: req.user?.id,
      action: 'RESELLER_PRODUCT_AUTH_ASSIGN',
      entity_type: 'reseller_product_authorizations',
      entity_id: rule._id,
      after_snapshot: rule.toObject(),
      req,
    });

    return res.status(200).json({
      status: 'success',
      message: 'Product authorization saved successfully',
      data: { rule, listing },
    });
  } catch (error) {
    console.error('[reseller.prodauth] assign_product_authorization error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 3. REVOKE AUTHORIZATION RULE ─────────────────────────────────────────────
/**
 * PUT /admin-api/reseller-mgmt/product-auth/revoke/:rule_id
 */
const revoke_product_authorization = async (req, res) => {
  try {
    const { rule_id } = req.params;
    if (!rule_id || !mongoose.Types.ObjectId.isValid(rule_id)) {
      return res.status(400).json({ status: 'error', message: 'Valid rule_id is required' });
    }

    const rule = await ResellerProductAuthorization.findById(rule_id);
    if (!rule) return res.status(404).json({ status: 'error', message: 'Rule not found' });

    rule.status = 'revoked';
    await rule.save();

    await logAudit({
      actor_type: 'cms_user',
      actor_id: req.user?.id,
      action: 'RESELLER_PRODUCT_AUTH_REVOKE',
      entity_type: 'reseller_product_authorizations',
      entity_id: rule_id,
      after_snapshot: { status: 'revoked' },
      req,
    });

    return res.json({ status: 'success', message: 'Authorization rule revoked' });
  } catch (error) {
    console.error('[reseller.prodauth] revoke_product_authorization error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 4. CHECK PRODUCT AUTH STATUS ─────────────────────────────────────────────
/**
 * GET /admin-api/reseller-mgmt/product-auth/check-auth/:id?category_id=...&subcategory_id=...&product_id=...&kit_id=...
 */
const check_product_auth = async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, subcategory_id, product_id, kit_id, project_type_id, industry_type_id, district_id } = req.query;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Valid reseller ID is required' });
    }

    const check = await evaluateResellerProductAuthorization(id, {
      category_id,
      subcategory_id,
      product_id,
      kit_id,
      project_type_id,
      industry_type_id,
      district_id,
    });

    return res.json({ status: 'success', data: check });
  } catch (error) {
    console.error('[reseller.prodauth] check_product_auth error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 5. LIST DISTRICT PRODUCT RULES ───────────────────────────────────────────
/**
 * GET /admin-api/reseller-mgmt/district-product-rules
 * Query params: ?district_id=...&state_id=...
 */
const list_district_product_rules = async (req, res) => {
  try {
    const filter = { status: 'active' };
    if (req.query.district_id) filter.district_id = req.query.district_id;
    if (req.query.state_id) filter.state_id = req.query.state_id;

    const rules = await DistrictProductRule.find(filter)
      .populate({ path: 'category_id', model: ProjectCategory, select: 'name' })
      .populate({ path: 'subcategory_id', model: ProjectSubcategory, select: 'name' })
      .populate({ path: 'product_id', model: Product, select: 'name sku_code' })
      .populate({ path: 'kit_id', model: WarehouseComboKit, select: 'kit_name kit_code' })
      .sort({ created_at: -1 })
      .lean();

    return res.json({ status: 'success', data: rules });
  } catch (error) {
    console.error('[reseller.prodauth] list_district_product_rules error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 6. CREATE DISTRICT PRODUCT RULE ──────────────────────────────────────────
/**
 * POST /admin-api/reseller-mgmt/district-product-rules
 * Body: { country_id, state_id, district_id, scope_type, category_id?, subcategory_id?, product_id?, kit_id?, project_type_ids?, industry_type_ids?, is_authorized? }
 */
const create_district_product_rule = async (req, res) => {
  try {
    const {
      country_id,
      state_id,
      district_id,
      scope_type,
      category_id,
      subcategory_id,
      product_id,
      kit_id,
      project_type_ids,
      industry_type_ids,
      is_authorized,
    } = req.body;

    if (!country_id || !state_id || !district_id) {
      return res.status(400).json({ status: 'error', message: 'country_id, state_id, and district_id are required' });
    }
    if (!scope_type || !['all', 'category', 'subcategory', 'product', 'kit'].includes(scope_type)) {
      return res.status(400).json({ status: 'error', message: 'Valid scope_type is required' });
    }

    const rule = await DistrictProductRule.create({
      country_id,
      state_id,
      district_id,
      scope_type,
      category_id: category_id || null,
      subcategory_id: subcategory_id || null,
      product_id: product_id || null,
      kit_id: kit_id || null,
      project_type_ids: project_type_ids || [],
      industry_type_ids: industry_type_ids || [],
      is_authorized: is_authorized !== undefined ? Boolean(is_authorized) : true,
      status: 'active',
      created_by: req.user?.id || null,
    });

    await logAudit({
      actor_type: 'cms_user',
      actor_id: req.user?.id,
      action: 'DISTRICT_PRODUCT_RULE_CREATE',
      entity_type: 'district_product_rules',
      entity_id: rule._id,
      after_snapshot: rule.toObject(),
      req,
    });

    return res.status(201).json({ status: 'success', message: 'District product rule created successfully', data: rule });
  } catch (error) {
    console.error('[reseller.prodauth] create_district_product_rule error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 7. DELETE DISTRICT PRODUCT RULE ──────────────────────────────────────────
/**
 * DELETE /admin-api/reseller-mgmt/district-product-rules/:id
 */
const delete_district_product_rule = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Valid rule ID is required' });
    }

    const rule = await DistrictProductRule.findByIdAndUpdate(id, { $set: { status: 'inactive' } });
    if (!rule) return res.status(404).json({ status: 'error', message: 'Rule not found' });

    await logAudit({
      actor_type: 'cms_user',
      actor_id: req.user?.id,
      action: 'DISTRICT_PRODUCT_RULE_DELETE',
      entity_type: 'district_product_rules',
      entity_id: id,
      before_snapshot: rule.toObject(),
      req,
    });

    return res.json({ status: 'success', message: 'District product rule deleted successfully' });
  } catch (error) {
    console.error('[reseller.prodauth] delete_district_product_rule error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 8. SEED DUMMY RULES ──────────────────────────────────────────────────────
const seed_dummy_rules = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Valid reseller ID is required' });
    }

    const reseller = await Reseller.findOne({ _id: id, deleted_at: null });
    if (!reseller) return res.status(404).json({ status: 'error', message: 'Reseller not found' });

    const products = await Product.find({ deleted_at: null }).limit(3).lean();
    const categories = await ProjectCategory.find({ deleted_at: null }).limit(2).lean();
    const kits = await WarehouseComboKit.find({ deleted_at: null }).limit(2).lean();

    let count = 0;

    // 1. Seed 'all' scope rule
    await ResellerProductAuthorization.findOneAndUpdate(
      { reseller_id: id, scope_type: 'all', status: 'active' },
      {
        reseller_id: id,
        scope_type: 'all',
        is_authorized: true,
        source: 'admin_override',
        override_reason: 'Full catalog access seed rule',
        status: 'active',
      },
      { upsert: true, new: true }
    );
    count++;

    // 2. Seed Category rules
    for (const cat of categories) {
      await ResellerProductAuthorization.findOneAndUpdate(
        { reseller_id: id, scope_type: 'category', category_id: cat._id, status: 'active' },
        {
          reseller_id: id,
          scope_type: 'category',
          category_id: cat._id,
          is_authorized: true,
          source: 'admin_override',
          override_reason: `Category access whitelist: ${cat.name}`,
          status: 'active',
        },
        { upsert: true, new: true }
      );
      count++;
    }

    // 3. Seed Product rules
    for (const prod of products) {
      await ResellerProductAuthorization.findOneAndUpdate(
        { reseller_id: id, scope_type: 'product', product_id: prod._id, status: 'active' },
        {
          reseller_id: id,
          scope_type: 'product',
          product_id: prod._id,
          category_id: prod.category_id || null,
          subcategory_id: prod.subcategory_id || null,
          is_authorized: true,
          source: 'admin_override',
          override_reason: `Product authorization: ${prod.name}`,
          status: 'active',
        },
        { upsert: true, new: true }
      );
      count++;

      // Upsert listing
      await ResellerListing.findOneAndUpdate(
        { reseller_id: id, item_type: 'product', product_id: prod._id },
        {
          reseller_id: id,
          item_type: 'product',
          product_id: prod._id,
          category_id: prod.category_id || null,
          subcategory_id: prod.subcategory_id || null,
          title: prod.name,
          description: prod.description,
          image_url: prod.image,
          stock_quantity: prod.stock_quantity || 100,
          cost_price_paise: prod.base_price_paise || 100000,
          map_price_paise: prod.base_price_paise || 100000,
          selling_price_paise: prod.base_price_paise || 100000,
          assignment_status: 'assigned',
          assigned_at: new Date(),
        },
        { upsert: true, new: true }
      );
    }

    // 4. Seed Kit rules
    for (const k of kits) {
      await ResellerProductAuthorization.findOneAndUpdate(
        { reseller_id: id, scope_type: 'kit', kit_id: k._id, status: 'active' },
        {
          reseller_id: id,
          scope_type: 'kit',
          kit_id: k._id,
          category_id: k.category_id || null,
          subcategory_id: k.subcategory_id || null,
          is_authorized: true,
          source: 'admin_override',
          override_reason: `Combo kit whitelist: ${k.kit_name}`,
          status: 'active',
        },
        { upsert: true, new: true }
      );
      count++;
    }

    return res.json({
      status: 'success',
      message: `${count} dummy product authorization rules seeded successfully!`,
    });
  } catch (err) {
    console.error('[reseller.prodauth] seed_dummy_rules error:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to seed dummy product authorization rules' });
  }
};

/**
 * PUT /admin-api/reseller-mgmt/product-auth/stock/:id
 */
const update_product_auth_stock = async (req, res) => {
  try {
    const { id } = req.params;
    const { stock_quantity, reseller_id, product_id } = req.body;
    const newStock = Math.max(0, parseInt(stock_quantity, 10) || 0);

    const rule = await ResellerProductAuthorization.findById(id).lean();
    const targetResellerId = reseller_id || rule?.reseller_id;
    const targetProductId = product_id || rule?.product_id;

    if (targetResellerId && targetProductId) {
      await ResellerListing.findOneAndUpdate(
        { reseller_id: targetResellerId, item_type: 'product', product_id: targetProductId },
        { $set: { stock_quantity: newStock } },
        { upsert: true }
      );
      await Product.findByIdAndUpdate(targetProductId, { $set: { stock_quantity: newStock } });
    }

    await logAudit({
      actor_type: 'cms_user',
      actor_id: req.user?.id || null,
      action: 'RESELLER_PRODUCT_AUTH_STOCK_UPDATE',
      entity_type: 'reseller_product_authorizations',
      entity_id: id,
      after_snapshot: { stock_quantity: newStock, reseller_id: targetResellerId, product_id: targetProductId },
      req,
    });

    return res.json({ status: 'success', message: `Stock updated to ${newStock} units successfully!`, stock_quantity: newStock });
  } catch (err) {
    console.error('[reseller.prodauth] update_product_auth_stock error:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to update stock quantity' });
  }
};

module.exports = {
  list_product_authorizations,
  assign_product_authorization,
  revoke_product_authorization,
  update_product_auth_stock,
  check_product_auth,
  seed_dummy_rules,
  list_district_product_rules,
  create_district_product_rule,
  delete_district_product_rule,
};
