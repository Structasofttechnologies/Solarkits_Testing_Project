const mongoose = require('mongoose');
const { Brand, Product, OemPartnerProduct } = require('../../models/core_db');

/**
 * GET /solarshop/oem-partner-products
 * Fetch all OEM partner brands along with their assigned products
 */
exports.get_oem_partners = async (req, res) => {
  try {
    const { search, all_brands } = req.query;

    // Filter brands: default to is_oem_partner: true, or all if requested
    const brandFilter = { deleted_at: null };
    if (all_brands !== 'true') {
      brandFilter.is_oem_partner = true;
    }

    if (search && search.trim()) {
      const q = search.trim();
      brandFilter.$or = [
        { brand_name: { $regex: q, $options: 'i' } },
        { company_name: { $regex: q, $options: 'i' } }
      ];
    }

    let oemBrands = await Brand.find(brandFilter)
      .sort({ brand_name: 1 })
      .lean();

    // If no brands are currently flagged as OEM partner and user didn't explicitly request all_brands,
    // fetch all brands so admin has partners to work with, but sort OEM partners first
    if (oemBrands.length === 0 && all_brands !== 'true') {
      const fallbackBrands = await Brand.find({ deleted_at: null })
        .sort({ is_oem_partner: -1, brand_name: 1 })
        .limit(20)
        .lean();
      if (fallbackBrands.length > 0) {
        oemBrands = fallbackBrands;
      }
    }

    const brandIds = oemBrands.map(b => b._id);

    // Fetch assignment records for these brands
    const assignments = await OemPartnerProduct.find({
      oem_brand_id: { $in: brandIds },
      deleted_at: null
    })
      .populate({
        path: 'product_ids',
        match: { deleted_at: null },
        select: 'name sku_code image template_id subtype_id brand_id base_price_paise is_active',
        populate: [
          { path: 'template_id', select: 'name' },
          { path: 'subtype_id', select: 'name' },
          { path: 'brand_id', select: 'brand_name logo' }
        ]
      })
      .lean();

    const assignmentMap = {};
    assignments.forEach(a => {
      if (a.oem_brand_id) {
        assignmentMap[a.oem_brand_id.toString()] = a;
      }
    });

    const result = oemBrands.map(b => {
      const bId = b._id.toString();
      const assignment = assignmentMap[bId];
      const validAssignedProducts = (assignment?.product_ids || []).filter(Boolean);

      return {
        id: b._id,
        _id: b._id,
        brand_name: b.brand_name,
        company_name: b.company_name,
        logo: b.logo,
        is_oem_partner: Boolean(b.is_oem_partner),
        is_supplier: Boolean(b.is_supplier),
        assigned_products: validAssignedProducts.map(p => ({
          id: p._id,
          _id: p._id,
          name: p.name,
          sku_code: p.sku_code || 'N/A',
          image: p.image || null,
          template_name: p.template_id?.name || 'General',
          subtype_name: p.subtype_id?.name || 'Standard',
          brand_name: p.brand_id?.brand_name || b.brand_name,
          base_price_paise: p.base_price_paise || 0,
          is_active: p.is_active !== false
        })),
        assigned_product_ids: validAssignedProducts.map(p => p._id.toString()),
        assigned_count: validAssignedProducts.length,
        notes: assignment?.notes || null,
        updated_at: assignment?.updated_at || b.updated_at
      };
    });

    return res.json({
      status: 'success',
      total_partners: result.length,
      data: result
    });
  } catch (err) {
    console.error('Error in get_oem_partners:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * GET /solarshop/oem-partner-products/catalog-products
 * Fetch system products catalog for assignment selection
 */
exports.get_catalog_products = async (req, res) => {
  try {
    const { search, template_id, subtype_id, brand_id } = req.query;

    const filter = { deleted_at: null };

    if (template_id && mongoose.Types.ObjectId.isValid(template_id)) {
      filter.template_id = new mongoose.Types.ObjectId(template_id);
    }
    if (subtype_id && mongoose.Types.ObjectId.isValid(subtype_id)) {
      filter.subtype_id = new mongoose.Types.ObjectId(subtype_id);
    }
    if (brand_id && mongoose.Types.ObjectId.isValid(brand_id)) {
      filter.brand_id = new mongoose.Types.ObjectId(brand_id);
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { sku_code: { $regex: q, $options: 'i' } }
      ];
    }

    const products = await Product.find(filter)
      .populate('template_id', 'name')
      .populate('subtype_id', 'name')
      .populate('brand_id', 'brand_name logo')
      .sort({ created_at: -1 })
      .limit(300)
      .lean();

    const data = products.map(p => ({
      id: p._id,
      _id: p._id,
      name: p.name,
      sku_code: p.sku_code || 'N/A',
      image: p.image || null,
      template_id: p.template_id?._id,
      template_name: p.template_id?.name || 'General',
      subtype_id: p.subtype_id?._id,
      subtype_name: p.subtype_id?.name || 'Standard',
      brand_id: p.brand_id?._id,
      brand_name: p.brand_id?.brand_name || 'Standard',
      brand_logo: p.brand_id?.logo || null,
      base_price_paise: p.base_price_paise || 0,
      is_active: p.is_active !== false
    }));

    return res.json({
      status: 'success',
      total_products: data.length,
      data
    });
  } catch (err) {
    console.error('Error in get_catalog_products:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * PUT /solarshop/oem-partner-products/:oemBrandId/assign
 * Assign / update products for an OEM Partner
 */
exports.assign_products = async (req, res) => {
  try {
    const { oemBrandId } = req.params;
    const { product_ids, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(oemBrandId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid OEM Partner Brand ID' });
    }

    const validProductIds = Array.isArray(product_ids)
      ? product_ids.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id))
      : [];

    const updated = await OemPartnerProduct.findOneAndUpdate(
      { oem_brand_id: new mongoose.Types.ObjectId(oemBrandId) },
      {
        $set: {
          product_ids: validProductIds,
          notes: notes !== undefined ? notes : null,
          is_active: true,
          deleted_at: null
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
      .populate({
        path: 'product_ids',
        match: { deleted_at: null },
        select: 'name sku_code image template_id subtype_id brand_id base_price_paise is_active',
        populate: [
          { path: 'template_id', select: 'name' },
          { path: 'subtype_id', select: 'name' },
          { path: 'brand_id', select: 'brand_name logo' }
        ]
      })
      .lean();

    return res.json({
      status: 'success',
      message: 'OEM Partner product assignments updated successfully',
      data: updated
    });
  } catch (err) {
    console.error('Error in assign_products:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * DELETE /solarshop/oem-partner-products/:oemBrandId/products/:productId
 * Unassign a single product from an OEM partner
 */
exports.remove_product = async (req, res) => {
  try {
    const { oemBrandId, productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(oemBrandId) || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid Brand or Product ID' });
    }

    const updated = await OemPartnerProduct.findOneAndUpdate(
      { oem_brand_id: new mongoose.Types.ObjectId(oemBrandId) },
      {
        $pull: { product_ids: new mongoose.Types.ObjectId(productId) }
      },
      { new: true }
    ).lean();

    return res.json({
      status: 'success',
      message: 'Product removed from OEM Partner',
      data: updated
    });
  } catch (err) {
    console.error('Error in remove_product:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * PATCH /solarshop/oem-partner-products/:brandId/toggle-oem
 * Quick helper to set or unset is_oem_partner flag on a brand
 */
exports.toggle_oem_status = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { is_oem_partner } = req.body;

    if (!mongoose.Types.ObjectId.isValid(brandId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid Brand ID' });
    }

    const updated = await Brand.findByIdAndUpdate(
      brandId,
      { is_oem_partner: Boolean(is_oem_partner) },
      { new: true }
    ).lean();

    return res.json({
      status: 'success',
      message: `Brand OEM status updated to ${Boolean(is_oem_partner)}`,
      data: updated
    });
  } catch (err) {
    console.error('Error in toggle_oem_status:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};
