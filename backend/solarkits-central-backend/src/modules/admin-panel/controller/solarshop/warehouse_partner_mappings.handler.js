const mongoose = require('mongoose');
const {
  WarehouseKitPartnerMapping,
  WarehouseKitActivation,
  WarehouseComboKit,
  Brand,
  Product,
  ProductSku,
  SolarKit,
  RegionalCluster,
  OemPartnerProduct
} = require('../../models/core_db');
const { CompanyWarehouse } = require('../../../warehouse-panel/models/company_warehouse_db');
const { GeoLevel0, GeoLevel1, GeoLevel2, Cluster } = require('../../models/geolocation_db');

const isValidObjectId = (id) => Boolean(id && mongoose.Types.ObjectId.isValid(id));

/**
 * Helper to normalize component type from template name or subtype name
 */
const detectComponentType = (templateName = '', subtypeName = '', compName = '') => {
  const combined = `${templateName} ${subtypeName} ${compName}`.toLowerCase();
  if (combined.includes('panel') || combined.includes('module') || combined.includes('solar cell') || combined.includes('pv')) {
    return 'panel';
  }
  if (combined.includes('inverter') || combined.includes('microinverter') || combined.includes('pcus') || combined.includes('string inv')) {
    return 'inverter';
  }
  if (combined.includes('bos') || combined.includes('structure') || combined.includes('protection') || combined.includes('cable') || combined.includes('wire') || combined.includes('mc4') || combined.includes('acdb') || combined.includes('dcdb')) {
    return 'bos_kit';
  }
  return 'base_component';
};

/**
 * GET /solarshop/warehouse-partner-mappings/warehouses
 * Returns warehouses list with live kit counts, partner configuration status,
 * and high-level metric cards (Total, Configured, Pending).
 */
exports.get_warehouses_partner_overview = async (req, res) => {
  try {
    const { country_id, state_id, cluster_id, search } = req.query;

    // 1. Resolve Active Countries
    const activeCountries = await GeoLevel0.find({ deleted_at: null })
      .select('_id name iso2 currency_code currency_symbol')
      .lean();

    let targetCountryId = country_id;
    if (!targetCountryId || !isValidObjectId(targetCountryId)) {
      const india = activeCountries.find((c) => c.name?.toLowerCase() === 'india');
      targetCountryId = india ? india._id : activeCountries[0]?._id;
    }

    if (!targetCountryId) {
      return res.json({
        status: 'success',
        summary: {
          total_warehouses: 0,
          configured_warehouses: 0,
          pending_warehouses: 0,
          total_live_kits: 0
        },
        warehouses: [],
        active_countries: []
      });
    }

    // 2. Query Warehouses
    const whFilter = { deleted_at: null };
    if (targetCountryId) {
      whFilter.$or = [
        { level_0: new mongoose.Types.ObjectId(targetCountryId) },
        { country_id: new mongoose.Types.ObjectId(targetCountryId) }
      ];
    }

    const allWarehouses = await CompanyWarehouse.find(whFilter).lean();

    // Fetch Geo references for these warehouses (states, districts, clusters)
    const stateIds = [...new Set(allWarehouses.map((w) => w.level_1 || w.state_id).filter(isValidObjectId))];
    const districtIds = [...new Set(allWarehouses.map((w) => w.level_2 || w.district_id).filter(isValidObjectId))];

    const [statesList, districtsList] = await Promise.all([
      GeoLevel1.find({ _id: { $in: stateIds } }).select('_id name code').lean(),
      GeoLevel2.find({ _id: { $in: districtIds } }).select('_id name code cluster').lean()
    ]);

    const stateMap = Object.fromEntries(statesList.map((s) => [s._id.toString(), s]));
    const districtMap = Object.fromEntries(districtsList.map((d) => [d._id.toString(), d]));

    // Resolve Cluster Names
    const clusterIds = [...new Set(districtsList.map((d) => d.cluster).filter(isValidObjectId))];
    const clustersList = await Cluster.find({ _id: { $in: clusterIds } }).select('_id name code').lean();
    const clusterMap = Object.fromEntries(clustersList.map((c) => [c._id.toString(), c]));

    // 3. Fetch Kit Activations for these warehouses
    const warehouseObjectIds = allWarehouses.map((w) => w._id);

    // Fetch all valid, non-deleted, active combo kits from WarehouseComboKit
    const activeComboKits = await WarehouseComboKit.find({
      deleted_at: null,
      is_active: true
    }).select('_id').lean();
    const validComboKitIds = new Set(activeComboKits.map((k) => k._id.toString()));

    const activations = await WarehouseKitActivation.find({
      warehouse_id: { $in: warehouseObjectIds },
      deleted_at: null,
      $or: [{ is_combokit_active: true }, { is_customize_kit_active: true }]
    }).lean();

    // Map activations by warehouse ID: only valid active combo kits count as live kits
    const warehouseLiveKitMap = {};
    warehouseObjectIds.forEach((wId) => {
      warehouseLiveKitMap[wId.toString()] = new Set();
    });

    activations.forEach((act) => {
      const wIdStr = (act.warehouse_id?._id || act.warehouse_id)?.toString();
      const kitIdStr = (act.combo_kit_id?._id || act.combo_kit_id)?.toString();
      if (wIdStr && kitIdStr && validComboKitIds.has(kitIdStr) && warehouseLiveKitMap[wIdStr]) {
        warehouseLiveKitMap[wIdStr].add(kitIdStr);
      }
    });

    // 4. Fetch Partner Mappings for these warehouses
    const partnerMappings = await WarehouseKitPartnerMapping.find({
      warehouse_id: { $in: warehouseObjectIds }
    }).lean();

    const warehouseMappingsMap = {};
    warehouseObjectIds.forEach((wId) => {
      warehouseMappingsMap[wId.toString()] = {};
    });

    partnerMappings.forEach((mapDoc) => {
      const wIdStr = mapDoc.warehouse_id?.toString();
      const kitIdStr = mapDoc.combo_kit_id?.toString();
      if (wIdStr && kitIdStr && warehouseMappingsMap[wIdStr]) {
        warehouseMappingsMap[wIdStr][kitIdStr] = mapDoc;
      }
    });

    // 5. Build warehouse overview items
    let totalLiveKitsSum = 0;
    let configuredWarehousesCount = 0;
    let pendingWarehousesCount = 0;

    const warehousesOverview = allWarehouses.map((wh) => {
      const wIdStr = wh._id.toString();
      const stateObj = stateMap[(wh.level_1 || wh.state_id)?.toString()];
      const distObj = districtMap[(wh.level_2 || wh.district_id)?.toString()];
      const clusterObj = distObj?.cluster ? clusterMap[distObj.cluster.toString()] : null;

      const liveKitIds = Array.from(warehouseLiveKitMap[wIdStr] || []);
      const liveKitsCount = liveKitIds.length;
      totalLiveKitsSum += liveKitsCount;

      // Count how many live kits have partner mapping configured
      const whMappings = warehouseMappingsMap[wIdStr] || {};
      let configuredKitsCount = 0;
      let partiallyConfiguredKitsCount = 0;

      liveKitIds.forEach((kitId) => {
        const mapping = whMappings[kitId];
        if (mapping && mapping.is_configured) {
          configuredKitsCount += 1;
        } else if (mapping && mapping.mapped_components > 0) {
          partiallyConfiguredKitsCount += 1;
        }
      });

      const pendingKitsCount = liveKitsCount - configuredKitsCount;

      let status = 'no_kits';
      if (liveKitsCount > 0) {
        if (configuredKitsCount === liveKitsCount) {
          status = 'configured';
          configuredWarehousesCount += 1;
        } else if (configuredKitsCount > 0 || partiallyConfiguredKitsCount > 0) {
          status = 'partially_configured';
          pendingWarehousesCount += 1;
        } else {
          status = 'pending';
          pendingWarehousesCount += 1;
        }
      }

      return {
        id: wh._id,
        _id: wh._id,
        warehouse_code: wh.warehouse_code || wh.code || 'N/A',
        warehouse_name: wh.name || wh.warehouse_name || wh.warehouse_code || 'Warehouse',
        address: wh.address || wh.facility_address || 'Facility Address',
        pincode: wh.pincode || '',
        state_id: wh.level_1 || wh.state_id,
        state_name: stateObj?.name || wh.state || 'N/A',
        district_id: wh.level_2 || wh.district_id,
        district_name: distObj?.name || wh.district || '',
        cluster_id: distObj?.cluster || wh.cluster_id || null,
        cluster_name: clusterObj?.name || wh.cluster || (distObj?.cluster ? 'Regional Cluster' : 'Not Mapped'),
        live_kits_count: liveKitsCount,
        configured_kits_count: configuredKitsCount,
        pending_kits_count: pendingKitsCount,
        status, // 'configured' | 'partially_configured' | 'pending' | 'no_kits'
        is_configured: status === 'configured'
      };
    });

    // Apply optional filters (state, cluster, search)
    let filteredWarehouses = warehousesOverview;
    if (state_id && state_id !== 'all') {
      filteredWarehouses = filteredWarehouses.filter(
        (w) => w.state_id?.toString() === state_id.toString()
      );
    }
    if (cluster_id && cluster_id !== 'all') {
      filteredWarehouses = filteredWarehouses.filter(
        (w) => w.cluster_id?.toString() === cluster_id.toString()
      );
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filteredWarehouses = filteredWarehouses.filter(
        (w) =>
          w.warehouse_code.toLowerCase().includes(q) ||
          w.warehouse_name.toLowerCase().includes(q) ||
          w.address.toLowerCase().includes(q) ||
          w.state_name.toLowerCase().includes(q) ||
          w.cluster_name.toLowerCase().includes(q)
      );
    }

    return res.json({
      status: 'success',
      summary: {
        total_warehouses: allWarehouses.length,
        configured_warehouses: configuredWarehousesCount,
        pending_warehouses: pendingWarehousesCount,
        no_kits_warehouses: allWarehouses.length - (configuredWarehousesCount + pendingWarehousesCount),
        total_live_kits: totalLiveKitsSum
      },
      current_country_id: targetCountryId,
      active_countries: activeCountries.map((c) => ({
        id: c._id,
        _id: c._id,
        name: c.name,
        iso2: c.iso2,
        currency_code: c.currency_code
      })),
      warehouses: filteredWarehouses
    });
  } catch (err) {
    console.error('Error in get_warehouses_partner_overview:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * GET /solarshop/warehouse-partner-mappings/warehouse/:warehouseId
 * Returns a specific warehouse's live combo kits, with all dedicated kit products
 * (panels, inverters, BOS kits, accessories) populated, current partner mappings,
 * and lists of available OEM partners and Suppliers.
 */
exports.get_warehouse_kit_partner_config = async (req, res) => {
  try {
    const { warehouseId } = req.params;
    if (!warehouseId || !isValidObjectId(warehouseId)) {
      return res.status(400).json({ status: 'error', message: 'Valid warehouse ID is required' });
    }

    const warehouseObjId = new mongoose.Types.ObjectId(warehouseId);
    const warehouse = await CompanyWarehouse.findOne({ _id: warehouseObjId, deleted_at: null }).lean();
    if (!warehouse) {
      return res.status(404).json({ status: 'error', message: 'Warehouse not found' });
    }

    // Resolve Geo details
    const [stateDoc, distDoc] = await Promise.all([
      warehouse.level_1 ? GeoLevel1.findById(warehouse.level_1).select('name code').lean() : null,
      warehouse.level_2 ? GeoLevel2.findById(warehouse.level_2).select('name code cluster').lean() : null
    ]);

    let clusterDoc = null;
    let regionalClusterDoc = null;
    if (distDoc?.cluster) {
      [clusterDoc, regionalClusterDoc] = await Promise.all([
        Cluster.findById(distDoc.cluster).select('name code').lean(),
        RegionalCluster.findOne({ code: distDoc.cluster, deleted_at: null }).lean()
      ]);
    }

    // Preferred cluster brand IDs
    const preferredOemIds = (regionalClusterDoc?.oem_brand_ids || []).map((id) => id.toString());
    const preferredSupplierIds = (regionalClusterDoc?.supplier_brand_ids || []).map((id) => id.toString());

    // 1. Fetch Verified OEM Partners & Verified Suppliers
    const [allOemBrands, allSupplierBrands] = await Promise.all([
      Brand.find({ is_oem_partner: true, deleted_at: null })
        .select('_id brand_name company_name logo is_oem_partner is_supplier')
        .sort({ brand_name: 1 })
        .lean(),
      Brand.find({ is_supplier: true, deleted_at: null })
        .select('_id brand_name company_name logo is_oem_partner is_supplier')
        .sort({ brand_name: 1 })
        .lean()
    ]);

    // Fallback if no brands specifically flagged
    let oemPartnersList = allOemBrands;
    if (oemPartnersList.length === 0) {
      oemPartnersList = await Brand.find({ deleted_at: null })
        .select('_id brand_name company_name logo is_oem_partner is_supplier')
        .limit(25)
        .lean();
    }

    let suppliersList = allSupplierBrands;
    if (suppliersList.length === 0) {
      suppliersList = await Brand.find({ deleted_at: null })
        .select('_id brand_name company_name logo is_oem_partner is_supplier')
        .limit(25)
        .lean();
    }

    // 2. Fetch Live Kits for this Warehouse
    const activeComboKits = await WarehouseComboKit.find({
      deleted_at: null,
      is_active: true
    }).select('_id').lean();
    const validComboKitIds = new Set(activeComboKits.map((k) => k._id.toString()));

    const activations = await WarehouseKitActivation.find({
      warehouse_id: warehouseObjId,
      deleted_at: null,
      $or: [{ is_combokit_active: true }, { is_customize_kit_active: true }]
    }).lean();

    const liveKitIds = [
      ...new Set(
        activations
          .map((a) => (a.combo_kit_id?._id || a.combo_kit_id)?.toString())
          .filter((id) => id && validComboKitIds.has(id))
      )
    ];

    // 3. Fetch Combo Kits populated with products, templates, subtypes, and skus
    let comboKits = [];
    if (liveKitIds.length > 0) {
      comboKits = await WarehouseComboKit.find({
        _id: { $in: liveKitIds.map((id) => new mongoose.Types.ObjectId(id)) },
        deleted_at: null
      })
        .populate({
          path: 'solar_kit_id',
          select: 'name category_id subcategory_id type_id',
          populate: [
            { path: 'category_id', select: 'name' },
            { path: 'subcategory_id', select: 'name' },
            { path: 'type_id', select: 'name' }
          ]
        })
        .populate('base_components.template_id', 'name')
        .populate('base_components.subtype_id', 'name')
        .populate('base_components.brand_id', 'brand_name logo')
        .populate({
          path: 'base_components.sku_id',
          select: 'sku_code product_id',
          populate: {
            path: 'product_id',
            select: 'name image'
          }
        })
        .populate('bos_kits.brand_id', 'brand_name logo')
        .populate('bos_kits.template_ids', 'name')
        .populate('bos_kits.subtype_ids', 'name')
        .populate({
          path: 'bos_kits.sku_id',
          select: 'sku_code product_id',
          populate: {
            path: 'product_id',
            select: 'name image'
          }
        })
        .lean();
    }

    // 4. Fetch Existing Partner Mappings for this Warehouse
    const existingMappings = await WarehouseKitPartnerMapping.find({
      warehouse_id: warehouseObjId,
      combo_kit_id: { $in: liveKitIds.map((id) => new mongoose.Types.ObjectId(id)) }
    })
      .populate('product_mappings.oem_partner_id', 'brand_name logo')
      .populate('product_mappings.supplier_partner_id', 'brand_name logo')
      .lean();

    const mappingMap = Object.fromEntries(
      existingMappings.map((m) => [m.combo_kit_id.toString(), m])
    );

    // 5. Structure dedicated products per kit
    const kitsConfigData = comboKits.map((kit) => {
      const kitIdStr = kit._id.toString();
      const existingMapDoc = mappingMap[kitIdStr];
      const savedProductMap = {};
      (existingMapDoc?.product_mappings || []).forEach((pm) => {
        if (pm.component_key) {
          savedProductMap[pm.component_key] = pm;
        }
      });

      const dedicatedProducts = [];

      // Extract Base Components (Panels, Inverters, etc.)
      (kit.base_components || []).forEach((bc, idx) => {
        const compKey = `base_${bc.sku_id?._id || bc._id || idx}`;
        const templateName = bc.template_id?.name || 'Component';
        const subtypeName = bc.subtype_id?.name || '';
        const prodName = bc.sku_id?.product_id?.name || `${templateName} - ${subtypeName || 'Standard'}`;
        const skuCode = bc.sku_id?.sku_code || 'N/A';
        const prodImg = bc.sku_id?.product_id?.image || null;
        const brandName = bc.brand_id?.brand_name || null;
        const cType = detectComponentType(templateName, subtypeName, prodName);

        const savedItem = savedProductMap[compKey];

        dedicatedProducts.push({
          component_key: compKey,
          component_type: cType,
          template_name: templateName,
          subtype_name: subtypeName,
          product_name: prodName,
          sku_code: skuCode,
          quantity: bc.quantity || 1,
          image: prodImg,
          brand_name: brandName,
          partner_type: savedItem?.supplier_partner_id ? 'supplier' : 'oem_partner',
          partner_id: savedItem?.supplier_partner_id?._id || savedItem?.supplier_partner_id || savedItem?.oem_partner_id?._id || savedItem?.oem_partner_id || null,
          oem_partner_id: savedItem?.oem_partner_id?._id || savedItem?.oem_partner_id || null,
          supplier_partner_id: savedItem?.supplier_partner_id?._id || savedItem?.supplier_partner_id || null,
          is_mapped: Boolean(savedItem && (savedItem.oem_partner_id || savedItem.supplier_partner_id)),
          notes: savedItem?.notes || ''
        });
      });

      // Extract BOS Kits
      (kit.bos_kits || []).forEach((bk, idx) => {
        const compKey = `bos_${bk.sku_id?._id || bk._id || idx}`;
        const bundleName = bk.name || `BOS Kit Bundle #${idx + 1}`;
        const skuCode = bk.sku_id?.sku_code || 'BOS-BUNDLE';
        const prodImg = bk.image || bk.sku_id?.product_id?.image || null;
        const brandName = bk.brand_id?.brand_name || null;

        const savedItem = savedProductMap[compKey];
        const savedOem = savedItem?.oem_partner_id?._id || savedItem?.oem_partner_id || null;
        const savedSup = savedItem?.supplier_partner_id?._id || savedItem?.supplier_partner_id || null;

        dedicatedProducts.push({
          component_key: compKey,
          component_type: 'bos_kit',
          template_name: 'BOS Kit',
          subtype_name: 'Balance of System Bundle',
          product_name: bundleName,
          sku_code: skuCode,
          quantity: bk.quantity || 1,
          image: prodImg,
          brand_name: brandName,
          partner_type: savedSup ? 'supplier' : 'oem_partner',
          partner_id: savedSup || savedOem || null,
          oem_partner_id: savedOem,
          supplier_partner_id: savedSup,
          is_mapped: Boolean(savedOem || savedSup),
          notes: savedItem?.notes || ''
        });
      });

      // Count mapped products
      const mappedCount = dedicatedProducts.filter((p) => p.is_mapped).length;
      const isFullyConfigured = dedicatedProducts.length > 0 && mappedCount === dedicatedProducts.length;

      return {
        id: kit._id,
        _id: kit._id,
        name: kit.name,
        description: kit.description,
        capacity: kit.capacity || 0,
        kit_image: kit.kit_image,
        category_name: kit.solar_kit_id?.category_id?.name || 'Solar PV',
        subcategory_name: kit.solar_kit_id?.subcategory_id?.name || 'Rooftop System',
        type_name: kit.solar_kit_id?.type_id?.name || 'On-Grid',
        total_products: dedicatedProducts.length,
        mapped_products: mappedCount,
        is_configured: isFullyConfigured,
        products: dedicatedProducts
      };
    });

    const totalKitCount = kitsConfigData.length;
    const fullyConfiguredKitsCount = kitsConfigData.filter((k) => k.is_configured).length;

    return res.json({
      status: 'success',
      warehouse: {
        id: warehouse._id,
        _id: warehouse._id,
        warehouse_code: warehouse.warehouse_code || warehouse.code || 'N/A',
        warehouse_name: warehouse.name || warehouse.warehouse_name || 'Warehouse',
        address: warehouse.address || warehouse.facility_address || 'Facility Address',
        pincode: warehouse.pincode || '',
        state_name: stateDoc?.name || warehouse.state || 'N/A',
        district_name: distDoc?.name || warehouse.district || '',
        cluster_name: clusterDoc?.name || 'Regional Cluster',
        preferred_oem_brand_ids: preferredOemIds,
        preferred_supplier_brand_ids: preferredSupplierIds
      },
      summary: {
        total_live_kits: totalKitCount,
        configured_kits: fullyConfiguredKitsCount,
        pending_kits: totalKitCount - fullyConfiguredKitsCount,
        overall_status:
          totalKitCount === 0
            ? 'no_kits'
            : fullyConfiguredKitsCount === totalKitCount
            ? 'configured'
            : fullyConfiguredKitsCount > 0
            ? 'partially_configured'
            : 'pending'
      },
      available_oem_partners: oemPartnersList.map((p) => ({
        id: p._id,
        _id: p._id,
        brand_name: p.brand_name,
        company_name: p.company_name,
        logo: p.logo,
        is_oem_partner: Boolean(p.is_oem_partner),
        is_preferred: preferredOemIds.includes(p._id.toString())
      })),
      available_suppliers: suppliersList.map((s) => ({
        id: s._id,
        _id: s._id,
        brand_name: s.brand_name,
        company_name: s.company_name,
        logo: s.logo,
        is_supplier: Boolean(s.is_supplier),
        is_preferred: preferredSupplierIds.includes(s._id.toString())
      })),
      kits: kitsConfigData
    });
  } catch (err) {
    console.error('Error in get_warehouse_kit_partner_config:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * POST /solarshop/warehouse-partner-mappings/save
 * Save or update partner mappings for a single combo kit in a warehouse
 */
exports.save_kit_partner_mapping = async (req, res) => {
  try {
    const { warehouse_id, combo_kit_id, product_mappings } = req.body;

    if (!warehouse_id || !isValidObjectId(warehouse_id)) {
      return res.status(400).json({ status: 'error', message: 'Valid warehouse ID is required' });
    }
    if (!combo_kit_id || !isValidObjectId(combo_kit_id)) {
      return res.status(400).json({ status: 'error', message: 'Valid combo kit ID is required' });
    }
    if (!Array.isArray(product_mappings)) {
      return res.status(400).json({ status: 'error', message: 'product_mappings array is required' });
    }

    const totalCount = product_mappings.length;
    let mappedCount = 0;

    const sanitizedMappings = product_mappings.map((pm) => {
      const partnerType = pm.partner_type === 'supplier' ? 'supplier' : 'oem_partner';
      let oemId = null;
      let supplierId = null;

      if (partnerType === 'supplier') {
        const sId = pm.partner_id || pm.supplier_partner_id;
        if (isValidObjectId(sId)) {
          supplierId = new mongoose.Types.ObjectId(sId);
        }
      } else {
        const oId = pm.partner_id || pm.oem_partner_id;
        if (isValidObjectId(oId)) {
          oemId = new mongoose.Types.ObjectId(oId);
        }
      }

      const isMapped = Boolean(oemId || supplierId);
      if (isMapped) mappedCount += 1;

      return {
        component_key: pm.component_key,
        component_type: pm.component_type || 'other',
        product_name: pm.product_name,
        sku_code: pm.sku_code || null,
        template_name: pm.template_name || null,
        subtype_name: pm.subtype_name || null,
        brand_name: pm.brand_name || null,
        quantity: pm.quantity || 1,
        image: pm.image || null,
        oem_partner_id: oemId,
        supplier_partner_id: supplierId,
        supply_mode: partnerType,
        is_mapped: isMapped,
        notes: pm.notes || null
      };
    });

    const isFullyConfigured = totalCount > 0 && mappedCount === totalCount;

    const savedDoc = await WarehouseKitPartnerMapping.findOneAndUpdate(
      {
        warehouse_id: new mongoose.Types.ObjectId(warehouse_id),
        combo_kit_id: new mongoose.Types.ObjectId(combo_kit_id)
      },
      {
        warehouse_id: new mongoose.Types.ObjectId(warehouse_id),
        combo_kit_id: new mongoose.Types.ObjectId(combo_kit_id),
        product_mappings: sanitizedMappings,
        total_components: totalCount,
        mapped_components: mappedCount,
        is_configured: isFullyConfigured,
        updated_at: new Date()
      },
      { upsert: true, returnDocument: 'after' }
    );

    return res.json({
      status: 'success',
      message: 'Kit partner product mapping saved successfully',
      data: savedDoc
    });
  } catch (err) {
    console.error('Error in save_kit_partner_mapping:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * POST /solarshop/warehouse-partner-mappings/bulk-save
 * Bulk save mappings for multiple kits in a warehouse
 */
exports.bulk_save_warehouse_partner_mappings = async (req, res) => {
  try {
    const { warehouse_id, kit_mappings } = req.body;

    if (!warehouse_id || !isValidObjectId(warehouse_id)) {
      return res.status(400).json({ status: 'error', message: 'Valid warehouse ID is required' });
    }
    if (!Array.isArray(kit_mappings) || kit_mappings.length === 0) {
      return res.status(400).json({ status: 'error', message: 'kit_mappings array is required' });
    }

    const results = [];
    for (const item of kit_mappings) {
      const { combo_kit_id, product_mappings } = item;
      if (!combo_kit_id || !isValidObjectId(combo_kit_id) || !Array.isArray(product_mappings)) {
        continue;
      }

      const totalCount = product_mappings.length;
      let mappedCount = 0;

      const sanitizedMappings = product_mappings.map((pm) => {
        const partnerType = pm.partner_type === 'supplier' ? 'supplier' : 'oem_partner';
        let oemId = null;
        let supplierId = null;

        if (partnerType === 'supplier') {
          const sId = pm.partner_id || pm.supplier_partner_id;
          if (isValidObjectId(sId)) {
            supplierId = new mongoose.Types.ObjectId(sId);
          }
        } else {
          const oId = pm.partner_id || pm.oem_partner_id;
          if (isValidObjectId(oId)) {
            oemId = new mongoose.Types.ObjectId(oId);
          }
        }

        const isMapped = Boolean(oemId || supplierId);
        if (isMapped) mappedCount += 1;

        return {
          component_key: pm.component_key,
          component_type: pm.component_type || 'other',
          product_name: pm.product_name,
          sku_code: pm.sku_code || null,
          template_name: pm.template_name || null,
          subtype_name: pm.subtype_name || null,
          brand_name: pm.brand_name || null,
          quantity: pm.quantity || 1,
          image: pm.image || null,
          oem_partner_id: oemId,
          supplier_partner_id: supplierId,
          supply_mode: partnerType,
          is_mapped: isMapped,
          notes: pm.notes || null
        };
      });

      const isFullyConfigured = totalCount > 0 && mappedCount === totalCount;

      const savedDoc = await WarehouseKitPartnerMapping.findOneAndUpdate(
        {
          warehouse_id: new mongoose.Types.ObjectId(warehouse_id),
          combo_kit_id: new mongoose.Types.ObjectId(combo_kit_id)
        },
        {
          warehouse_id: new mongoose.Types.ObjectId(warehouse_id),
          combo_kit_id: new mongoose.Types.ObjectId(combo_kit_id),
          product_mappings: sanitizedMappings,
          total_components: totalCount,
          mapped_components: mappedCount,
          is_configured: isFullyConfigured,
          updated_at: new Date()
        },
        { upsert: true, returnDocument: 'after' }
      );

      results.push(savedDoc);
    }

    return res.json({
      status: 'success',
      message: `Successfully saved ${results.length} kit partner configurations`,
      data: results
    });
  } catch (err) {
    console.error('Error in bulk_save_warehouse_partner_mappings:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};
