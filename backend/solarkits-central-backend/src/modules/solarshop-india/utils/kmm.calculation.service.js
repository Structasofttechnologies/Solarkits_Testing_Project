/**
 * kmm.calculation.service.js — Core calculation engine for Know My Margin (KMM).
 *
 * Implements authoritative cost, BOM, GST, and margin computations.
 * Used by backend calculation endpoints and validation services.
 */

function round2(val) {
  if (val === null || val === undefined || isNaN(val)) return 0;
  return Math.round(Number(val) * 100) / 100;
}

/**
 * Resolves location-based BOM rate from item's location_rates array.
 * Specificity order: pincode > district > state > default admin_rate.
 */
function resolveLocationRate(item, location = {}) {
  const rates = item.location_rates || [];
  if (!rates.length) return Number(item.admin_rate || 0);

  const pincode = String(location.pincode || '').trim();
  const districtId = location.district_id ? String(location.district_id) : '';
  const stateId = location.state_id ? String(location.state_id) : '';
  const districtName = String(location.district_name || '').trim().toLowerCase();
  const stateName = String(location.state_name || '').trim().toLowerCase();

  // 1. Pincode exact match
  if (pincode) {
    const pinMatch = rates.find(r => r.pincode && String(r.pincode).trim() === pincode);
    if (pinMatch && pinMatch.rate !== undefined) return Number(pinMatch.rate);
  }

  // 2. District match (ID or name)
  if (districtId || districtName) {
    const distMatch = rates.find(r => {
      if (districtId && r.district_id && String(r.district_id) === districtId) return true;
      if (districtName && r.district_name && String(r.district_name).trim().toLowerCase() === districtName) return true;
      return false;
    });
    if (distMatch && distMatch.rate !== undefined) return Number(distMatch.rate);
  }

  // 3. State match (ID or name)
  if (stateId || stateName) {
    const stateMatch = rates.find(r => {
      if (stateId && r.state_id && String(r.state_id) === stateId) return true;
      if (stateName && r.state_name && String(r.state_name).trim().toLowerCase() === stateName) return true;
      return false;
    });
    if (stateMatch && stateMatch.rate !== undefined) return Number(stateMatch.rate);
  }

  // Fallback to default admin rate
  return Number(item.admin_rate || 0);
}

/**
 * Calculates item amount and multiplier based on rate_type.
 */
function computeBomItem(item, { total_kw, quantity, location = {} }) {
  const isIncluded = Boolean(item.is_included_in_kit);
  if (isIncluded) {
    return {
      bom_id: item._id || item.bom_id || null,
      name: item.name || 'BOM Item',
      code: item.code || 'BOM',
      rate_type: item.rate_type || 'fixed',
      unit: item.unit || 'Nos',
      applied_rate: 0,
      multiplier_or_qty: 1,
      amount: 0,
      gst_applicable: Boolean(item.gst_applicable),
      gst_rate: Number(item.gst_rate || 18),
      is_mandatory: Boolean(item.is_mandatory),
      is_included_in_kit: true,
      visible_to_epc: item.visible_to_epc !== false,
    };
  }

  const rateType = item.rate_type || 'fixed';
  let appliedRate = Number(item.admin_rate || 0);
  let multiplierOrQty = 1;

  switch (rateType) {
    case 'fixed':
      appliedRate = Number(item.admin_rate || 0);
      multiplierOrQty = 1;
      break;

    case 'per_kw':
      appliedRate = Number(item.admin_rate || 0);
      multiplierOrQty = Number(total_kw || 0);
      break;

    case 'per_kit':
      appliedRate = Number(item.admin_rate || 0);
      multiplierOrQty = Number(quantity || 1);
      break;

    case 'quantity_based':
      appliedRate = Number(item.admin_rate || 0);
      multiplierOrQty = Number(item.quantity !== undefined ? item.quantity : (item.default_quantity || 1));
      break;

    case 'location_based':
      appliedRate = resolveLocationRate(item, location);
      multiplierOrQty = 1;
      break;

    default:
      appliedRate = Number(item.admin_rate || 0);
      multiplierOrQty = 1;
  }

  const amount = round2(appliedRate * multiplierOrQty);

  return {
    bom_id: item._id || item.bom_id || null,
    name: item.name || 'BOM Item',
    code: item.code || 'BOM',
    rate_type: rateType,
    unit: item.unit || 'Nos',
    applied_rate: round2(appliedRate),
    multiplier_or_qty: round2(multiplierOrQty),
    amount,
    gst_applicable: Boolean(item.gst_applicable),
    gst_rate: Number(item.gst_rate || 18),
    is_mandatory: Boolean(item.is_mandatory),
    is_included_in_kit: false,
    visible_to_epc: item.visible_to_epc !== false,
  };
}

/**
 * Main KMM Calculation Function.
 *
 * @param {Object} params
 * @param {Object} params.kit - { selling_price, capacity_kw }
 * @param {number} params.quantity - Number of kits (default 1)
 * @param {Array} params.bom_items - Array of BOM items (from DB or payload)
 * @param {Object} params.location - { state_id, district_id, pincode, state_name, district_name }
 * @param {Object} params.delivery - { delivery_cost }
 * @param {Object} params.margin - { type: 'amount' | 'percentage', value: number }
 * @param {Object} params.gst_settings - { method: 'on_cost' | 'on_cost_plus_margin', rate: number }
 * @returns {Object} Comprehensive calculation result
 */
function calculateMarginEstimate({
  kit = {},
  quantity = 1,
  bom_items = [],
  location = {},
  delivery = {},
  margin = { type: 'amount', value: 0 },
  gst_settings = {},
}) {
  const qty = Math.max(1, parseInt(quantity, 10) || 1);
  const capacityKw = Number(kit.capacity_kw || kit.capacity || 0);
  const totalKw = round2(capacityKw * qty);

  // Kit Pricing
  const kitUnitPrice = Number(kit.selling_price || kit.price || 0);
  const kitTotalPrice = round2(kitUnitPrice * qty);

  // BOM Items computation
  const computedBomItems = (bom_items || []).map(item =>
    computeBomItem(item, { total_kw: totalKw, quantity: qty, location })
  );

  const bomTotalCost = round2(
    computedBomItems.reduce((acc, item) => acc + (item.amount || 0), 0)
  );

  // Delivery Cost
  const deliveryCost = round2(Number(delivery.delivery_cost || 0));

  // Project Cost before GST (Kit + BOM + Delivery)
  const projectCostBeforeGst = round2(kitTotalPrice + bomTotalCost + deliveryCost);

  // Margin calculation
  const marginType = (margin.type === 'percentage') ? 'percentage' : 'amount';
  const marginVal = Math.max(0, Number(margin.value || 0));

  let marginAmount = 0;
  let marginPercentage = 0;

  if (marginType === 'percentage') {
    marginPercentage = round2(marginVal);
    marginAmount = round2(projectCostBeforeGst * (marginPercentage / 100));
  } else {
    marginAmount = round2(marginVal);
    marginPercentage = projectCostBeforeGst > 0
      ? round2((marginAmount / projectCostBeforeGst) * 100)
      : 0;
  }

  // GST Calculation
  const gstMethod = gst_settings.method === 'on_cost' ? 'on_cost' : 'on_cost_plus_margin';
  const gstRate = Number(gst_settings.rate !== undefined ? gst_settings.rate : (gst_settings.default_gst_rate || 18));

  let taxableBase = 0;
  let gstAmount = 0;
  let estimatedCustomerPrice = 0;
  let totalProjectCost = 0;

  if (gstMethod === 'on_cost') {
    // GST applied to project cost only; margin added on top
    taxableBase = projectCostBeforeGst;
    gstAmount = round2(taxableBase * (gstRate / 100));
    estimatedCustomerPrice = round2(taxableBase + gstAmount + marginAmount);
    totalProjectCost = round2(taxableBase + gstAmount);
  } else {
    // on_cost_plus_margin: GST applied on total taxable project cost + EPC margin
    taxableBase = round2(projectCostBeforeGst + marginAmount);
    gstAmount = round2(taxableBase * (gstRate / 100));
    estimatedCustomerPrice = round2(taxableBase + gstAmount);
    totalProjectCost = projectCostBeforeGst;
  }

  return {
    kit_unit_price: round2(kitUnitPrice),
    quantity: qty,
    kit_capacity_kw: round2(capacityKw),
    total_kw: totalKw,
    kit_total_price: kitTotalPrice,

    bom_items: computedBomItems,
    bom_total_cost: bomTotalCost,

    delivery_cost: deliveryCost,
    project_cost_before_gst: projectCostBeforeGst,

    gst_calculation_method: gstMethod,
    gst_rate: round2(gstRate),
    taxable_base: round2(taxableBase),
    gst_amount: gstAmount,

    margin_input_type: marginType,
    margin_percentage: marginPercentage,
    margin_amount: marginAmount,

    total_project_cost: totalProjectCost,
    estimated_customer_price: estimatedCustomerPrice,
    profit_amount: marginAmount,
  };
}

module.exports = {
  round2,
  resolveLocationRate,
  computeBomItem,
  calculateMarginEstimate,
};
