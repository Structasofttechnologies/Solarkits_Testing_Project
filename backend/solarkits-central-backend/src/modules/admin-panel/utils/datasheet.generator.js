const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const {
  Product,
  ProductSku,
  ProductTemplate,
  ProductSubtype,
  Brand,
  ProductAttributeValue,
  SubtypeAttribute,
  DatasheetDesignSetting
} = require('../models/core_db');
const { get_or_create_settings } = require('../controller/datasheet_settings.handler');

/**
 * Normalizes an image path or URL into a valid accessible URL.
 */
const normalizeImageUrl = (img) => {
  if (!img || typeof img !== 'string') return null;
  const trimmed = img.trim();
  if (!trimmed) return null;
  if (trimmed.includes('localhost:3001')) {
    return trimmed.replace('localhost:3001', 'localhost:5000');
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const cleanPath = trimmed.replace(/^public[\\/]/, '').replace(/^[\\/]/, '');
  const baseUrl = process.env.BASE_URL || process.env.BACKEND_URL || 'http://localhost:5000';
  return `${baseUrl.replace(/\/$/, '')}/${cleanPath}`;
};

/**
 * Preloads an image into a Buffer for PDFKit rendering.
 * Supports both local files and remote HTTP/HTTPS (Cloudinary, etc.).
 */
async function fetchImageBuffer(urlOrPath) {
  if (!urlOrPath || typeof urlOrPath !== 'string') return null;
  const trimmed = urlOrPath.trim();
  if (!trimmed) return null;

  // 1. Check local file system
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    try {
      const candidatePaths = [
        trimmed,
        path.resolve(trimmed),
        path.join(process.cwd(), trimmed),
        path.join(process.cwd(), 'public', trimmed.replace(/^public[\\/]/, '')),
        path.join(__dirname, '../../../../', trimmed)
      ];
      for (const p of candidatePaths) {
        if (fs.existsSync(p) && fs.statSync(p).isFile()) {
          return fs.readFileSync(p);
        }
      }
    } catch (e) {
      // ignore
    }
  }

  // 2. Fetch remote URL (e.g. Cloudinary) with timeout
  try {
    let fetchUrl = trimmed;
    if (fetchUrl.includes('localhost:3001')) {
      fetchUrl = fetchUrl.replace('localhost:3001', 'localhost:5000');
    }
    const res = await axios.get(fetchUrl, {
      responseType: 'arraybuffer',
      timeout: 4500
    });
    if (res.status === 200 && res.data) {
      return Buffer.from(res.data);
    }
  } catch (err) {
    console.warn(`[Datasheet PDF] Unable to download image from ${urlOrPath}:`, err.message);
  }
  return null;
}

/**
 * Aggregates all component products, specifications, and uploaded datasheets
 * for a given ComboKit into a unified kit datasheet structure.
 */
async function getCombinedKitDatasheetData(kitId) {
  const rawDb = mongoose.connection.db || (mongoose.connections && mongoose.connections[0]?.db) || Product.db;
  const objId = new mongoose.Types.ObjectId(kitId);

  // Find the combo kit in either pc_comobo_kit or pc_combo_kits
  let kit = await rawDb.collection('pc_comobo_kit').findOne({ _id: objId, deleted_at: null });
  if (!kit) {
    kit = await rawDb.collection('pc_combo_kits').findOne({ _id: objId, deleted_at: null });
  }
  if (!kit) {
    kit = await rawDb.collection('pc_comobo_kit').findOne({ _id: objId });
  }
  if (!kit) {
    throw new Error('Combo Kit not found.');
  }

  // 1. Collect all SKU IDs from base_components and bos_kits
  const skuIds = [];
  (kit.base_components || []).forEach(bc => {
    if (bc.sku_id) skuIds.push(new mongoose.Types.ObjectId(bc.sku_id));
  });
  (kit.bos_kits || []).forEach(bk => {
    if (bk.sku_id) skuIds.push(new mongoose.Types.ObjectId(bk.sku_id));
  });

  // 2. Fetch SKUs with populated Product, Brand, Subtype, and Template
  const skus = await ProductSku.find({ _id: { $in: skuIds } })
    .populate({
      path: 'product_id',
      populate: [
        { path: 'brand_id' },
        { path: 'subtype_id' },
        { path: 'template_id' }
      ]
    })
    .lean();

  const skuMap = {};
  skus.forEach(s => {
    skuMap[s._id.toString()] = s;
  });

  // 3. Fetch ProductAttributeValues for these SKUs and products
  const productIds = skus.map(s => s.product_id?._id).filter(Boolean);
  const pavs = await ProductAttributeValue.find({
    $or: [
      { sku_id: { $in: skuIds } },
      { product_id: { $in: productIds }, sku_id: null }
    ],
    deleted_at: null
  })
    .populate('attribute_id')
    .populate('unit_id', 'symbol')
    .populate('value_option_id', 'value')
    .lean();

  const pavBySku = {};
  const pavByProduct = {};
  pavs.forEach(pav => {
    if (pav.sku_id) {
      const sId = pav.sku_id.toString();
      if (!pavBySku[sId]) pavBySku[sId] = [];
      pavBySku[sId].push(pav);
    }
    if (pav.product_id) {
      const pId = pav.product_id.toString();
      if (!pavByProduct[pId]) pavByProduct[pId] = [];
      pavByProduct[pId].push(pav);
    }
  });

  // Helper to extract and format specifications for a component
  const resolveSpecsForComponent = (product, sku, categoryName, customName) => {
    const list = [];
    const seen = new Set();

    const addSpec = (name, value, group = "General") => {
      if (!name || value === null || value === undefined || value === "") return;
      const key = name.trim();
      const lower = key.toLowerCase();
      if (seen.has(lower)) return;
      seen.add(lower);
      list.push({
        id: `spec-${list.length + 1}`,
        specification: key,
        value: String(value).trim(),
        group: group || "General"
      });
    };

    // Brand Name
    const brandName = sku?.brand_id?.brand_name || product?.brand_id?.brand_name || "";
    if (brandName) addSpec("Brand / Manufacturer", brandName, "General");

    // Product Model
    const modelName = product?.name || sku?.sku_code || customName || "";
    if (modelName) addSpec("Model", modelName, "General");

    // Check if Product has saved structured specifications array
    if (product?.specifications && Array.isArray(product.specifications) && product.specifications.length > 0) {
      product.specifications.forEach(s => {
        const specName = s.key || s.specification || s.name;
        if (specName && s.value) {
          addSpec(specName, s.value, s.group || "Technical Details");
        }
      });
    }

    // Merge in ProductAttributeValues (SKU level first, then Product level)
    const skuPavList = sku?._id ? (pavBySku[sku._id.toString()] || []) : [];
    const prodPavList = product?._id ? (pavByProduct[product._id.toString()] || []) : [];
    [...skuPavList, ...prodPavList].forEach(pav => {
      const attrName = pav.attribute_id?.name;
      if (!attrName) return;

      let val = pav.value_text;
      if (val === null || val === undefined || val === "") {
        if (pav.value_number !== null && pav.value_number !== undefined) val = pav.value_number;
        else if (pav.value_boolean !== null && pav.value_boolean !== undefined) val = pav.value_boolean ? "Yes" : "No";
        else if (pav.value_option_id?.value) val = pav.value_option_id.value;
      }

      if (val !== null && val !== undefined && val !== "") {
        const unit = pav.unit_id?.symbol ? ` ${pav.unit_id.symbol}` : "";
        addSpec(attrName, `${val}${unit}`, "Technical Attributes");
      }
    });

    return list;
  };

  // 4. Build Structured Components List
  const components = [];

  // Group base_components
  (kit.base_components || []).forEach(bc => {
    const sku = skuMap[bc.sku_id?.toString()] || null;
    const product = sku?.product_id || null;
    const templateName = product?.template_id?.name || "";
    const subtypeName = product?.subtype_id?.name || "";

    let category = "Component";
    const lowerTpl = templateName.toLowerCase();
    const lowerSub = subtypeName.toLowerCase();
    if (lowerTpl.includes("panel") || lowerSub.includes("panel") || lowerSub.includes("module")) {
      category = "Solar Panel";
    } else if (lowerTpl.includes("inverter") || lowerSub.includes("inverter")) {
      category = "Solar Inverter";
    } else {
      category = templateName || "Component";
    }

    const specs = resolveSpecsForComponent(product, sku, category, product?.name);

    const isPanel = category === "Solar Panel";
    const isInverter = category === "Solar Inverter";

    // Only Panel and Inverter get their configured photo, BOS/others get null
    const rawImg = (isPanel || isInverter) ? (sku?.image || product?.image || null) : null;
    const resolvedImage = rawImg ? normalizeImageUrl(rawImg) : null;

    components.push({
      id: bc.sku_id ? bc.sku_id.toString() : `comp-${components.length + 1}`,
      category,
      productName: product?.name || subtypeName || "Component",
      brand: sku?.brand_id?.brand_name || product?.brand_id?.brand_name || "SolarKits",
      model: sku?.sku_code || product?.name || "",
      quantity: bc.quantity || 1,
      datasheetUrl: product?.datasheet || null,
      image: resolvedImage,
      specifications: specs
    });
  });

  // Helper to format individual BOS components with proper names, quantities, brands, and technical attributes
  const formatBosComponent = (bk, sku, product, brand, pavList = []) => {
    const code = (sku?.sku_code || '').toUpperCase();
    const rawName = (bk.name || product?.name || 'BOS Component').trim();
    const prodName = (product?.name || '').trim();
    const brandName = brand?.brand_name || sku?.brand_id?.brand_name || product?.brand_id?.brand_name ||
      (code.includes('POLYC') ? 'Polycab Solar' :
       code.includes('SUNNO') ? 'Solarkits' :
       code.includes('LT') || code.includes('LARSE') ? 'L&T' :
       code.includes('SIBAS') ? 'SIBASS' :
       code.includes('CRETO') ? 'Creton' : 'Reputed / Certified OEM');
    const qty = Number(bk.quantity || bk.qty || 1);

    let cleanName = rawName;
    let unit = 'Pcs';
    let group = 'BOS Hardware & Accessories';
    const details = [];
    const seenDetails = new Set();

    const addDetail = (str) => {
      if (!str) return;
      const trimmed = String(str).trim();
      const lower = trimmed.toLowerCase();
      // Skip meaningless filler values like 'capacity: 1'
      if (lower === 'capacity: 1' || lower === 'capacity: 1 pc' || lower === 'capacity: 1 unit') return;
      if (seenDetails.has(lower)) return;
      seenDetails.add(lower);
      details.push(trimmed);
    };

    // Check if ProductAttributeValues or product.specifications have attributes
    if (product?.specifications && Array.isArray(product.specifications)) {
      product.specifications.forEach(s => {
        const k = s.key || s.specification || s.name;
        if (k && s.value) addDetail(`${k}: ${s.value}`);
      });
    }
    if (pavList && pavList.length > 0) {
      pavList.forEach(pav => {
        const attrName = pav.attribute_id?.name;
        let val = pav.value_text || pav.value_number || (pav.value_boolean ? 'Yes' : null) || pav.value_option_id?.value;
        if (attrName && val) {
          const u = pav.unit_id?.symbol ? ` ${pav.unit_id.symbol}` : '';
          addDetail(`${attrName}: ${val}${u}`);
        }
      });
    }

    const isCableOrWire = (code.startsWith('CAB') || rawName.toLowerCase().includes('cable') || rawName.toLowerCase().includes('wire') || prodName.toLowerCase().includes('cable') || prodName.toLowerCase().includes('wire')) &&
      !rawName.toLowerCase().includes('tie') && !rawName.toLowerCase().includes('clamp') && !rawName.toLowerCase().includes('tap');

    if (isCableOrWire) {
      unit = 'Mtrs';
      group = 'Wiring & Cables';
      let mm = '2.5 sq.mm';
      if (code.includes('16SQMM') || prodName.includes('16') || rawName.includes('16')) mm = '16 sq.mm';
      else if (code.includes('4MM') || prodName.includes('4') || rawName.includes('4')) mm = '4 sq.mm';
      else if (code.includes('6MM') || prodName.includes('6') || rawName.includes('6')) mm = '6 sq.mm';

      if (code.includes('DCCA') || prodName.toLowerCase().includes('dc') || (rawName.toLowerCase().includes('dc') && !rawName.toLowerCase().includes('ac'))) {
        const color = (code.includes('BLAC') || rawName.toLowerCase().includes('black') || prodName.toLowerCase().includes('black')) ? 'Black' : 'Red';
        cleanName = `Wiring — ${color} DC Solar PV Cable (${mm})`;
        addDetail('1500V DC (EN 50618)');
        addDetail('Tinned Copper (Class 5 Flexible)');
        addDetail('XLPO UV-Resistant');
      } else if (code.includes('ACCA') || prodName.toLowerCase().includes('ac') || (rawName.toLowerCase().includes('ac') && !rawName.toLowerCase().includes('dc'))) {
        const color = (code.includes('BLAC') || rawName.toLowerCase().includes('black') || prodName.toLowerCase().includes('black')) ? 'Black' : 'Red';
        cleanName = `Wiring — ${color} AC Interconnection Cable (${mm})`;
        addDetail('1.1 kV AC (IS 694)');
        addDetail('High Purity Electrolytic Copper');
        addDetail('Flame Retardant PVC');
      } else if (code.includes('EART') || rawName.toLowerCase().includes('earth') || prodName.toLowerCase().includes('earth')) {
        cleanName = `Wiring — Green Copper Earthing Ground Wire (${mm})`;
        addDetail('Pure Electrolytic Copper');
        addDetail('FR PVC Green / Yellow');
      } else if (code.includes('LIGH') || rawName.toLowerCase().includes('lightning') || prodName.toLowerCase().includes('lightning')) {
        cleanName = `Wiring — Lightning Arrestor Down Conductor (${mm})`;
        addDetail('High-Grade Aluminium Conductor');
        addDetail('IS/IEC 62305 Standard');
      } else {
        cleanName = `Wiring — ${prodName || rawName} (${mm})`;
        addDetail('Certified Solar Grade Wire');
      }
    } else if (code.startsWith('DCD-') || prodName.toLowerCase().includes('dcdb') || rawName.toLowerCase().endsWith('dcdb')) {
      unit = 'Unit';
      group = 'ACDB & DCDB Switchgear';
      cleanName = 'DCDB — 1-String DC Distribution Box (1000V DC)';
      addDetail('IP65 Weatherproof UV Polycarbonate');
      addDetail('1000V DC Class II SPD + 1000V gPV Fuses');
      addDetail('Wall/Frame Mounting');
    } else if (code.startsWith('AC-') || prodName.toLowerCase().includes('acdb') || rawName.toLowerCase().includes('acdb')) {
      unit = 'Unit';
      group = 'ACDB & DCDB Switchgear';
      cleanName = 'ACDB — Single Phase AC Distribution Box (16A)';
      addDetail('IP65 Weatherproof UV Polycarbonate');
      addDetail('AC MCB + AC 40kA SPD Surge Protection');
      addDetail('Wall/Frame Mounting');
    } else if (code.startsWith('MC4') || rawName.toLowerCase().includes('mc4') || prodName.toLowerCase().includes('mc4')) {
      unit = 'Pairs';
      group = 'Hardware & Accessories';
      cleanName = 'Accessories — MC4 Solar PV Connectors (30A)';
      addDetail('1500V DC Rated (IEC) / 1000V (UL)');
      addDetail('Silver Plated Copper Contact');
      addDetail('IP68 Mated');
      addDetail('UL94-V0 Flame Class');
    } else if (code.includes('EAR-') && (rawName.toLowerCase().includes('rod') || prodName.toLowerCase().includes('rod') || code.includes('COPP'))) {
      unit = 'Pcs (1 Meter each)';
      group = 'Earthing & Lightning Protection';
      cleanName = 'Earthing Kit — Copper Bonded Earthing Rod (1 Meter)';
      addDetail('High Tensile Steel with Pure Copper Bonding');
      addDetail('Min 250 Microns Copper Bonded (UL 467 / IEEE 80)');
      addDetail('1 Meter Length');
    } else if (code.includes('EAR-') && (rawName.toLowerCase().includes('compound') || prodName.toLowerCase().includes('compound') || code.includes('CHEM'))) {
      unit = 'Bag (10 kg)';
      group = 'Earthing & Lightning Protection';
      cleanName = 'Earthing Kit — Chemical Earth Enhancement Compound';
      addDetail('Eco-friendly Moisture Retaining Earth Compound');
      addDetail('Resistivity < 0.2 Ohm-m');
      addDetail('10 kg Pack');
    } else if (code.startsWith('LIG-') || rawName.toLowerCase().includes('arrester') || prodName.toLowerCase().includes('arrester')) {
      unit = 'Set';
      group = 'Earthing & Lightning Protection';
      cleanName = 'Earthing Kit — Lightning Arrester Single Spike';
      addDetail('Conventional Single Spike System');
      addDetail('FRP Insulated Support Mast with Pure Copper Tip');
      addDetail('IS/IEC 62305 Standard');
    } else if (rawName.toLowerCase().includes('lug') || prodName.toLowerCase().includes('lug')) {
      unit = 'Pcs';
      group = 'Earthing & Lightning Protection';
      cleanName = 'Earthing Kit — Pure Copper Earthing Lugs';
      addDetail('Pure Electrolytic Copper Heavy Duty Terminal Lugs');
    } else if (rawName.toLowerCase().includes('tie') || prodName.toLowerCase().includes('tie') || code.startsWith('UVR-')) {
      unit = 'Pcs';
      group = 'Hardware & Accessories';
      cleanName = 'Accessories — UV Resistant Cable Ties (Weatherproof)';
      addDetail('UV Resistant Nylon 66 (Outdoor Grade)');
    } else if (rawName.toLowerCase().includes('clamp') || prodName.toLowerCase().includes('clamp') || code.startsWith('CLA-')) {
      unit = 'Pcs';
      group = 'Hardware & Accessories';
      const isLaClamp = code.includes('LACL') || prodName.toLowerCase().includes('la clamp') || rawName.toLowerCase().includes('la clamp');
      cleanName = isLaClamp ? 'Accessories — Lightning Arrestor Mounting Clamp' : 'Accessories — Single Nail Cable Clamps';
      addDetail(isLaClamp ? 'Galvanized Heavy Duty LA Mounting Support' : 'Heavy Duty Weatherproof Cable Clamping');
    } else if (rawName.toLowerCase().includes('bend') || prodName.toLowerCase().includes('bend') || (code.startsWith('PVC-') && prodName.toLowerCase().includes('bend'))) {
      unit = 'Pcs';
      group = 'Hardware & Accessories';
      cleanName = 'Accessories — PVC Bend (L-Bow Conduit Fitting)';
      addDetail('Heavy Duty Rigid PVC (UV Stabilized) IS 9537 Standard');
    } else if (rawName.toLowerCase().includes('tee') || prodName.toLowerCase().includes('tee') || (code.startsWith('PVC-') && prodName.toLowerCase().includes('tee'))) {
      unit = 'Pcs';
      group = 'Hardware & Accessories';
      cleanName = 'Accessories — PVC Tee Conduit Fittings';
      addDetail('Heavy Duty Rigid PVC (UV Stabilized) IS 9537 Standard');
    } else if (rawName.toLowerCase().includes('tap') || prodName.toLowerCase().includes('tap') || code.startsWith('WIR-')) {
      unit = 'Pc';
      group = 'Hardware & Accessories';
      cleanName = 'Accessories — Electrical Wire Insulation Tap';
      addDetail('Self-Adhesive Electrical Grade High Voltage Insulation Tap');
    } else if (rawName.toLowerCase().includes('wall') || prodName.toLowerCase().includes('wall') || code.startsWith('WAL-')) {
      unit = 'Pcs';
      group = 'Hardware & Accessories';
      cleanName = 'Accessories — Wall Grips & Anchor Fasteners';
      addDetail('Heavy Duty Nylon / PVC Wall Anchors');
    } else if (rawName.toLowerCase().includes('screw') || prodName.toLowerCase().includes('screw') || code.startsWith('SCR-')) {
      unit = 'Pcs';
      group = 'Hardware & Accessories';
      cleanName = 'Accessories — Screws & Fasteners (SS304 / Grade 8.8)';
      addDetail('SS304 Stainless Steel / High Tensile Galvanized Fasteners');
    } else {
      unit = 'Units';
      cleanName = prodName ? `${rawName} (${prodName})` : rawName;
      addDetail('Standard OEM Certified Solar Installation Component');
    }

    const quantityWithUnit = `${qty} ${unit}`;
    const specSummary = details.join(', ');
    const value = `Qty: ${quantityWithUnit} • ${brandName}${specSummary ? ' • ' + specSummary : ''}`;

    return {
      specification: cleanName,
      value,
      quantity: qty,
      quantityWithUnit,
      brand: brandName,
      group,
      details,
      specSummary
    };
  };

  // Group BOS Kits — Detailed resolution for every individual BOS component
  const bosItems = kit.bos_kits || [];
  if (bosItems.length > 0) {
    const bosSpecs = [];
    const bosDatasheetUrls = [];
    const bosBrands = new Set();
    const detailedSubComponents = [];

    // General scope & compliance header specifications
    bosSpecs.push({
      id: "bos-scope",
      specification: "BOS Package Scope",
      value: `Complete Balance of System (${bosItems.length} Verified Components Included)`,
      group: "General"
    });
    bosSpecs.push({
      id: "bos-compliance",
      specification: "Quality & Safety Standards",
      value: "Conforming to MNRE Guidelines, IS 694, IS/IEC 62305 & IEC 61439",
      group: "General"
    });

    bosItems.forEach((bk, idx) => {
      const sku = skuMap[bk.sku_id?.toString()] || null;
      const product = sku?.product_id || null;
      const brand = bk.brand_id || sku?.brand_id || product?.brand_id || null;

      if (product?.datasheet && !bosDatasheetUrls.includes(product.datasheet)) {
        bosDatasheetUrls.push(product.datasheet);
      }

      const pavList = (pavBySku[sku?._id?.toString()] || []).concat(pavByProduct[product?._id?.toString()] || []);
      const formatted = formatBosComponent(bk, sku, product, brand, pavList);

      if (formatted.brand && !formatted.brand.includes("Certified OEM")) {
        bosBrands.add(formatted.brand);
      }

      bosSpecs.push({
        id: `bos-item-${idx + 1}`,
        specification: formatted.specification,
        value: formatted.value,
        group: formatted.group || "BOS Components"
      });

      detailedSubComponents.push({
        name: formatted.specification,
        rawName: bk.name,
        quantity: formatted.quantity,
        quantityWithUnit: formatted.quantityWithUnit,
        brand: formatted.brand,
        skuCode: sku?.sku_code || "",
        image: null,
        details: formatted.details,
        specSummary: formatted.specSummary
      });
    });

    const brandDisplay = bosBrands.size > 0
      ? Array.from(bosBrands).join(", ")
      : "SOLARKITS / Certified Partners";

    components.push({
      id: "bos-kit-complete",
      category: "BOS Kit",
      productName: "Complete Residential / Commercial BOS Package",
      brand: brandDisplay,
      model: `${kit.capacity || 0} kW BOS Complete Package (${bosItems.length} Components)`,
      quantity: 1,
      datasheetUrl: bosDatasheetUrls[0] || null,
      image: null,
      subComponents: detailedSubComponents,
      specifications: bosSpecs
    });
  }

  // 5. Fetch Design Settings
  const designSettings = await get_or_create_settings();

  // 6. Build Consolidated Combined Table rows according to Section Order
  const orderList = designSettings.component_section_order || ["Solar Panel", "Solar Inverter", "BOS Kit"];
  const sortedComponents = [...components].sort((a, b) => {
    let idxA = orderList.findIndex(o => o.toLowerCase() === a.category.toLowerCase());
    let idxB = orderList.findIndex(o => o.toLowerCase() === b.category.toLowerCase());
    if (idxA === -1) idxA = 99;
    if (idxB === -1) idxB = 99;
    return idxA - idxB;
  });

  const combinedTable = [];
  sortedComponents.forEach(comp => {
    (comp.specifications || []).forEach(spec => {
      combinedTable.push({
        component: comp.category,
        productName: comp.productName,
        brand: comp.brand,
        specification: spec.specification,
        value: spec.value,
        group: spec.group
      });
    });
  });

  const panelComp = sortedComponents.find(c => c.category === "Solar Panel");
  const inverterComp = sortedComponents.find(c => c.category === "Solar Inverter");

  const equipmentPhotos = {
    panel: panelComp ? {
      productName: panelComp.productName,
      brand: panelComp.brand,
      model: panelComp.model,
      quantity: panelComp.quantity,
      image: panelComp.image,
      datasheetUrl: panelComp.datasheetUrl
    } : null,
    inverter: inverterComp ? {
      productName: inverterComp.productName,
      brand: inverterComp.brand,
      model: inverterComp.model,
      quantity: inverterComp.quantity,
      image: inverterComp.image,
      datasheetUrl: inverterComp.datasheetUrl
    } : null
  };

  return {
    kit: {
      id: kit._id.toString(),
      name: kit.name,
      capacity: kit.capacity || 0,
      datasheet: kit.datasheet || null,
      image: kit.kit_image || null
    },
    equipmentPhotos,
    components: sortedComponents,
    combinedTable,
    designSettings: designSettings.toObject ? designSettings.toObject() : designSettings
  };
}

/**
 * Generates an official, beautifully styled Combined Kit Datasheet PDF and streams it to Express response.
 */
async function generateCombinedDatasheetPdf(datasheetData, res) {
  const { kit, components, combinedTable, designSettings, equipmentPhotos } = datasheetData;

  // Resolve Panel & Inverter image data
  const panelData = equipmentPhotos?.panel || components.find(c => c.category === "Solar Panel");
  const inverterData = equipmentPhotos?.inverter || components.find(c => c.category === "Solar Inverter");

  // Preload Panel & Inverter images in parallel (Never preload BOS)
  const [panelBuffer, inverterBuffer] = await Promise.all([
    fetchImageBuffer(panelData?.image),
    fetchImageBuffer(inverterData?.image)
  ]);

  const doc = new PDFDocument({
    margin: 40,
    size: 'A4',
    bufferPages: true
  });

  // Pipe directly to response
  res.setHeader('Content-Type', 'application/pdf');
  const safeKitName = (kit.name || 'SolarKit').replace(/[^a-zA-Z0-9_-]/g, '_');
  res.setHeader('Content-Disposition', `attachment; filename="${safeKitName}_Combined_Datasheet.pdf"`);
  doc.pipe(res);

  // Palette from Admin Design Settings (with safe hex fallbacks)
  const headerBg = designSettings.table_header_bg || '#1E3A8A';
  const headerText = designSettings.table_header_text || '#FFFFFF';
  const altRowBg = designSettings.alternate_row_bg || '#F8FAFC';
  const tableText = designSettings.text_color || '#1E293B';
  const borderColor = designSettings.border_color || '#E2E8F0';
  const secHeaderBg = designSettings.section_header_bg || '#F1F5F9';

  const pageWidth = 515; // 595.28 - 2*40
  const startX = 40;
  let currentY = 40;

  // ─── Document Header Banner ───
  doc.rect(startX, currentY, pageWidth, 68).fill(headerBg);

  // Solarkits Brand Title
  doc.fillColor(headerText).fontSize(20).font('Helvetica-Bold').text('SOLARKITS.IN', startX + 16, currentY + 14);
  doc.fillColor(headerText).fontSize(8.5).font('Helvetica').text('Complete Solar ComboKit Engineering Datasheet', startX + 16, currentY + 38);

  // Right-side Capacity & Date
  doc.fillColor(headerText).fontSize(14).font('Helvetica-Bold').text(`${kit.capacity || 0} kW SYSTEM`, startX, currentY + 14, { align: 'right', width: pageWidth - 16 });
  const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  doc.fillColor(headerText).fontSize(8).font('Helvetica').text(`Issued: ${dateStr}`, startX, currentY + 38, { align: 'right', width: pageWidth - 16 });

  currentY += 78;

  // ─── Kit Context Card ───
  doc.rect(startX, currentY, pageWidth, 42).fillAndStroke('#FFFFFF', borderColor);
  doc.fillColor('#0F172A').fontSize(12).font('Helvetica-Bold').text(kit.name, startX + 12, currentY + 10, { width: 340, lineBreak: false });
  doc.fillColor('#64748B').fontSize(8).font('Helvetica').text('Technical specification summary compiled from verified OEM components.', startX + 12, currentY + 26);

  // Compliance Badge
  doc.rect(startX + pageWidth - 145, currentY + 10, 135, 22).fill('#ECFDF5');
  doc.rect(startX + pageWidth - 145, currentY + 10, 135, 22).stroke('#10B981');
  doc.fillColor('#065F46').fontSize(7.5).font('Helvetica-Bold').text('✓ MNRE & BIS COMPLIANT', startX + pageWidth - 140, currentY + 16, { width: 125, align: 'center' });

  currentY += 52;

  // ─── Major Equipment Visual Showcase (Panel & Inverter ONLY — NO BOS) ───
  const hasEquipment = Boolean(panelData || inverterData);
  if (hasEquipment) {
    const cardGap = 15;
    const cardWidth = (pageWidth - cardGap) / 2; // 250 pt each
    const cardHeight = 78;

    // --- Panel Card (Left) ---
    const panelX = startX;
    doc.roundedRect(panelX, currentY, cardWidth, cardHeight, 6).fill('#FFFFFF');
    doc.roundedRect(panelX, currentY, cardWidth, cardHeight, 6).stroke(borderColor);
    doc.roundedRect(panelX, currentY, cardWidth, 4, 2).fill(headerBg);

    doc.fillColor(headerBg).fontSize(7).font('Helvetica-Bold')
      .text('SOLAR PV MODULE (PANEL)', panelX + 10, currentY + 8);

    const imgBoxX = panelX + 10;
    const imgBoxY = currentY + 20;
    const imgBoxW = 50;
    const imgBoxH = 50;

    let panelImgDrawn = false;
    if (panelBuffer) {
      try {
        doc.image(panelBuffer, imgBoxX, imgBoxY, { fit: [imgBoxW, imgBoxH], align: 'center', valign: 'center' });
        panelImgDrawn = true;
      } catch (err) {
        console.warn('[Datasheet PDF] Error rendering panel image buffer:', err.message);
      }
    }
    if (!panelImgDrawn) {
      doc.roundedRect(imgBoxX, imgBoxY, imgBoxW, imgBoxH, 4).fill('#F8FAFC');
      doc.roundedRect(imgBoxX, imgBoxY, imgBoxW, imgBoxH, 4).stroke(borderColor);
      doc.fillColor('#94A3B8').fontSize(6.5).font('Helvetica-Bold')
        .text('PHOTO\nCONFIGURED', imgBoxX + 2, imgBoxY + 18, { width: imgBoxW - 4, align: 'center' });
    }

    const pTextX = imgBoxX + imgBoxW + 8;
    const pTextW = cardWidth - (imgBoxW + 24);
    const pName = panelData?.productName || 'High-Efficiency Solar PV Module';
    const pBrand = panelData?.brand || 'SolarKits Tier-1';
    const pModel = panelData?.model ? `SKU: ${panelData.model}` : '';
    const pQty = panelData?.quantity ? `Qty: ${panelData.quantity} Units` : 'Qty: 1 Set';

    doc.fillColor('#0F172A').fontSize(8).font('Helvetica-Bold')
      .text(pName, pTextX, currentY + 20, { width: pTextW, height: 22, ellipsis: true });
    doc.fillColor('#475569').fontSize(7).font('Helvetica')
      .text(`Brand: ${pBrand}`, pTextX, currentY + 36, { width: pTextW, lineBreak: false });
    if (pModel) {
      doc.fillColor('#64748B').fontSize(6.5).font('Helvetica')
        .text(pModel, pTextX, currentY + 47, { width: pTextW, lineBreak: false });
    }
    doc.fillColor('#059669').fontSize(7).font('Helvetica-Bold')
      .text(pQty, pTextX, currentY + 58, { width: pTextW, lineBreak: false });

    // --- Inverter Card (Right) ---
    const invX = startX + cardWidth + cardGap;
    doc.roundedRect(invX, currentY, cardWidth, cardHeight, 6).fill('#FFFFFF');
    doc.roundedRect(invX, currentY, cardWidth, cardHeight, 6).stroke(borderColor);
    doc.roundedRect(invX, currentY, cardWidth, 4, 2).fill('#D97706');

    doc.fillColor('#D97706').fontSize(7).font('Helvetica-Bold')
      .text('SOLAR GRID-TIED INVERTER', invX + 10, currentY + 8);

    const invImgBoxX = invX + 10;
    const invImgBoxY = currentY + 20;

    let invImgDrawn = false;
    if (inverterBuffer) {
      try {
        doc.image(inverterBuffer, invImgBoxX, invImgBoxY, { fit: [imgBoxW, imgBoxH], align: 'center', valign: 'center' });
        invImgDrawn = true;
      } catch (err) {
        console.warn('[Datasheet PDF] Error rendering inverter image buffer:', err.message);
      }
    }
    if (!invImgDrawn) {
      doc.roundedRect(invImgBoxX, invImgBoxY, imgBoxW, imgBoxH, 4).fill('#F8FAFC');
      doc.roundedRect(invImgBoxX, invImgBoxY, imgBoxW, imgBoxH, 4).stroke(borderColor);
      doc.fillColor('#94A3B8').fontSize(6.5).font('Helvetica-Bold')
        .text('PHOTO\nCONFIGURED', invImgBoxX + 2, invImgBoxY + 18, { width: imgBoxW - 4, align: 'center' });
    }

    const iTextX = invImgBoxX + imgBoxW + 8;
    const iTextW = cardWidth - (imgBoxW + 24);
    const iName = inverterData?.productName || 'Solar Power Conditioning Inverter';
    const iBrand = inverterData?.brand || 'SolarKits Tier-1';
    const iModel = inverterData?.model ? `SKU: ${inverterData.model}` : '';
    const iQty = inverterData?.quantity ? `Qty: ${inverterData.quantity} Unit` : 'Qty: 1 Unit';

    doc.fillColor('#0F172A').fontSize(8).font('Helvetica-Bold')
      .text(iName, iTextX, currentY + 20, { width: iTextW, height: 22, ellipsis: true });
    doc.fillColor('#475569').fontSize(7).font('Helvetica')
      .text(`Brand: ${iBrand}`, iTextX, currentY + 36, { width: iTextW, lineBreak: false });
    if (iModel) {
      doc.fillColor('#64748B').fontSize(6.5).font('Helvetica')
        .text(iModel, iTextX, currentY + 47, { width: iTextW, lineBreak: false });
    }
    doc.fillColor('#059669').fontSize(7).font('Helvetica-Bold')
      .text(iQty, iTextX, currentY + 58, { width: iTextW, lineBreak: false });

    currentY += cardHeight + 14;
  }

  // ─── Table Header ───
  const colWidths = [110, 185, 220]; // Total = 515
  const colX = [startX, startX + colWidths[0], startX + colWidths[0] + colWidths[1]];

  const colHeadings = designSettings.column_headings || {};
  const compHeaderTitle = colHeadings.component || 'Component Category';
  const specHeaderTitle = colHeadings.specification || 'Technical Specification';
  const valHeaderTitle = colHeadings.value || 'Value / Details';

  const drawTableHeader = (y) => {
    doc.rect(startX, y, pageWidth, 22).fill(headerBg);
    doc.fillColor(headerText).fontSize(8.5).font('Helvetica-Bold');
    doc.text(compHeaderTitle, colX[0] + 8, y + 6);
    doc.text(specHeaderTitle, colX[1] + 8, y + 6);
    doc.text(valHeaderTitle, colX[2] + 8, y + 6);
    return y + 22;
  };

  currentY = drawTableHeader(currentY);

  // ─── Render Components & Specifications ───
  components.forEach((comp) => {
    // Check page overflow for section header
    if (currentY > 730) {
      doc.addPage();
      currentY = drawTableHeader(40);
    }

    // Section Header for Component
    doc.rect(startX, currentY, pageWidth, 20).fill(secHeaderBg);
    doc.rect(startX, currentY, pageWidth, 20).stroke(borderColor);

    doc.fillColor('#0F172A').fontSize(8.5).font('Helvetica-Bold');
    const compLabel = `${comp.category.toUpperCase()} — ${comp.productName} (${comp.brand})`;
    doc.text(compLabel, startX + 8, currentY + 5, { width: pageWidth - 16, lineBreak: false });
    currentY += 20;

    // Rows
    const specs = comp.specifications || [];
    specs.forEach((spec, rIdx) => {
      const specText = String(spec.specification || '');
      const valText = String(spec.value || '');

      doc.fontSize(7.5).font('Helvetica-Bold');
      const hSpec = doc.heightOfString(specText, { width: colWidths[1] - 12 });
      doc.fontSize(7.5).font('Helvetica');
      const hVal = doc.heightOfString(valText, { width: colWidths[2] - 12 });
      const rowHeight = Math.max(18, Math.max(hSpec, hVal) + 8);

      if (currentY + rowHeight > 770) {
        doc.addPage();
        currentY = drawTableHeader(40);
      }

      const isAlt = rIdx % 2 === 1;
      const rowBg = isAlt ? altRowBg : '#FFFFFF';

      doc.rect(startX, currentY, pageWidth, rowHeight).fill(rowBg);
      doc.rect(startX, currentY, pageWidth, rowHeight).stroke(borderColor);

      doc.fillColor('#64748B').fontSize(7.5).font('Helvetica');
      doc.text(comp.category, colX[0] + 8, currentY + 5, { width: colWidths[0] - 12, lineBreak: false });

      doc.fillColor(tableText).fontSize(7.5).font('Helvetica-Bold');
      doc.text(specText, colX[1] + 8, currentY + 5, { width: colWidths[1] - 12 });

      doc.fillColor(tableText).fontSize(7.5).font('Helvetica');
      doc.text(valText, colX[2] + 8, currentY + 5, { width: colWidths[2] - 12 });

      currentY += rowHeight;
    });
  });

  // ─── Footer Section ───
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    const oldBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    doc.rect(startX, 792, pageWidth, 0.5).stroke('#CBD5E1');
    doc.fillColor('#94A3B8').fontSize(7).font('Helvetica').text(
      'SOLARKITS.IN © Certified Digital Technical Datasheet. All component ratings comply with MNRE & IEC technical guidelines.',
      startX,
      796,
      { width: 360, lineBreak: false }
    );
    doc.text(`Page ${i + 1} of ${pageCount}`, startX, 796, { align: 'right', width: pageWidth, lineBreak: false });

    doc.page.margins.bottom = oldBottom;
  }

  doc.end();
}

module.exports = {
  getCombinedKitDatasheetData,
  generateCombinedDatasheetPdf
};
