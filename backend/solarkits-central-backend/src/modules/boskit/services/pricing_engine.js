'use strict';

const mongoose = require('mongoose');

class PricingEngine {
  /**
   * Centralized Server-Side Pricing & Tax Engine
   *
   * Evaluates deterministic rule priority:
   * 1. Distributor-specific rule (Distributor Channel Setting / User Override)
   * 2. District rule
   * 3. State rule
   * 4. Project-Type rule
   * 5. Industry rule
   * 6. Plan Tier rule
   * 7. Product Default MRP
   *
   * @param {Object} context
   * @param {Array<{product_id?: string, kit_id?: string, quantity: number, custom_price_paise?: number}>} context.items
   * @param {'distributor'|'dealer'|'guest'|'admin'} [context.buyer_type='guest']
   * @param {string} [context.buyer_id] - Distributor or Dealer ID
   * @param {string} [context.plan_id] - Assigned Plan ID
   * @param {string} [context.plan_code] - Assigned Plan Code
   * @param {string} [context.industry_type_id] - Industry type ID
   * @param {string} [context.project_type_id] - Project type ID
   * @param {string} [context.state_id] - Territory State ID
   * @param {string} [context.district_id] - Territory District ID
   * @param {string} [context.origin_state_code='GJ'] - Origin State Code (e.g. 'GJ')
   * @param {string} [context.destination_state_code='GJ'] - Destination State Code
   * @returns {Promise<Object>} Calculated price breakdown and MOQ compliance
   */
  static async calculate(context = {}) {
    const {
      items = [],
      buyer_type = 'guest',
      buyer_id = null,
      plan_id = null,
      plan_code = null,
      industry_type_id = null,
      project_type_id = null,
      state_id = null,
      district_id = null,
      origin_state_code = 'GJ',
      destination_state_code = 'GJ',
    } = context;

    const isInterstate =
      (origin_state_code || 'GJ').trim().toUpperCase() !==
      (destination_state_code || 'GJ').trim().toUpperCase();

    if (!Array.isArray(items) || items.length === 0) {
      return {
        items: [],
        summary: {
          subtotal_paise: 0,
          subtotal_inr: 0,
          total_discount_paise: 0,
          total_discount_inr: 0,
          net_taxable_paise: 0,
          net_taxable_inr: 0,
          cgst_paise: 0,
          cgst_inr: 0,
          sgst_paise: 0,
          sgst_inr: 0,
          igst_paise: 0,
          igst_inr: 0,
          total_tax_paise: 0,
          total_tax_inr: 0,
          shipping_paise: 0,
          shipping_inr: 0,
          grand_total_paise: 0,
          grand_total_inr: 0,
          is_interstate: isInterstate,
          origin_state_code,
          destination_state_code,
          buyer_type,
        },
        moq_passed: true,
        moq_errors: [],
      };
    }

    const Product = mongoose.model('products');
    const BoskitChannelSettings = mongoose.model('boskit_channel_settings');
    const BoskitPriceRule = mongoose.model('boskit_price_rules');
    const BoskitDistributorPlan = mongoose.model('boskit_distributor_plans');
    const BoskitTaxRule = mongoose.model('boskit_tax_rules');
    const BoskitMoqRule = mongoose.model('boskit_moq_rules');

    const now = new Date();

    // 1. Fetch Products
    const productIds = items.map((i) => i.product_id).filter(Boolean);
    const productDocs = await Product.find({ _id: { $in: productIds } }).lean();
    const productMap = new Map(productDocs.map((p) => [p._id.toString(), p]));

    // 2. Fetch Plan (if provided or referenced)
    let planDoc = null;
    if (plan_id) {
      planDoc = await BoskitDistributorPlan.findById(plan_id).lean();
    } else if (plan_code) {
      planDoc = await BoskitDistributorPlan.findOne({ plan_code: plan_code.toUpperCase() }).lean();
    }

    // 3. Fetch Channel Settings active candidates
    const dateQuery = {
      status: 'active',
      $or: [{ effective_from: null }, { effective_from: { $lte: now } }],
      $and: [{ $or: [{ effective_to: null }, { effective_to: { $gte: now } }] }],
    };

    const [channelSettings, priceRules, taxRules, moqRules] = await Promise.all([
      BoskitChannelSettings.find(dateQuery).sort({ rule_priority: 1, created_at: -1 }).lean(),
      BoskitPriceRule.find(dateQuery).sort({ priority: 1, created_at: -1 }).lean(),
      BoskitTaxRule.find(dateQuery).sort({ priority: 1 }).lean(),
      BoskitMoqRule.find(dateQuery).lean(),
    ]);

    let subtotalPaise = 0;
    let totalDiscountPaise = 0;
    let netTaxablePaise = 0;
    let totalCgstPaise = 0;
    let totalSgstPaise = 0;
    let totalIgstPaise = 0;
    let totalTaxPaise = 0;
    const moqErrors = [];

    const calculatedItems = items.map((item, index) => {
      const prodIdStr = item.product_id ? item.product_id.toString() : null;
      const prod = prodIdStr ? productMap.get(prodIdStr) || {} : {};
      const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);

      // Base MRP resolution in Paise
      let baseMrpPaise = 0;
      if (prod.mrp_paise && prod.mrp_paise > 0) {
        baseMrpPaise = Math.round(prod.mrp_paise);
      } else if (prod.price && prod.price > 0) {
        baseMrpPaise = Math.round(prod.price * 100);
      } else if (item.custom_price_paise && item.custom_price_paise > 0) {
        baseMrpPaise = Math.round(item.custom_price_paise);
      } else {
        baseMrpPaise = 1000000; // ₹10,000 fallback MRP
      }

      // ── Resolve Hierarchy Rules ───────────────────────────────────────────
      let appliedRule = null;
      let appliedScope = 'product_default';
      let discountType = null; // 'percentage' | 'fixed' | 'fixed_rate'
      let discountValue = 0;
      let unitBasePricePaise = baseMrpPaise; // Taxable price per unit
      let resolvedMoq = prod.min_order_qty || 1;
      let gstRatePct = prod.tax_percent || prod.gst_rate || 18;

      // 1. Distributor-specific Channel Setting
      if (buyer_id) {
        const distChannel = channelSettings.find(
          (cs) => cs.distributor_id && cs.distributor_id.toString() === buyer_id.toString()
        );
        if (distChannel) {
          const prodConfig = distChannel.product_configs?.find(
            (pc) => pc.product_id && pc.product_id.toString() === prodIdStr
          );
          if (prodConfig) {
            appliedRule = distChannel;
            appliedScope = 'distributor_specific_channel';
            if (prodConfig.mrp_paise) baseMrpPaise = prodConfig.mrp_paise;
            if (prodConfig.gst_rate_pct !== undefined) gstRatePct = prodConfig.gst_rate_pct;
            if (buyer_type === 'distributor') {
              if (prodConfig.distributor_rate_paise) {
                discountType = 'fixed_rate';
                unitBasePricePaise = prodConfig.distributor_rate_paise;
                discountValue = Math.max(0, baseMrpPaise - unitBasePricePaise);
              }
              if (prodConfig.distributor_moq) resolvedMoq = prodConfig.distributor_moq;
            } else if (buyer_type === 'dealer') {
              if (prodConfig.dealer_rate_paise) {
                discountType = 'fixed_rate';
                unitBasePricePaise = prodConfig.dealer_rate_paise;
                discountValue = Math.max(0, baseMrpPaise - unitBasePricePaise);
              }
              if (prodConfig.dealer_moq) resolvedMoq = prodConfig.dealer_moq;
            }
          }
        }
      }

      // 2. User Override Price Rule (if not matched yet)
      if (!appliedRule && buyer_id) {
        const userPriceRule = priceRules.find(
          (pr) =>
            pr.scope === 'user_override' &&
            ((pr.distributor_id && pr.distributor_id.toString() === buyer_id.toString()) ||
              (pr.dealer_id && pr.dealer_id.toString() === buyer_id.toString())) &&
            (!pr.product_id || pr.product_id.toString() === prodIdStr)
        );
        if (userPriceRule) {
          appliedRule = userPriceRule;
          appliedScope = 'user_override';
          if (userPriceRule.rule_type === 'fixed_distributor_rate' && buyer_type === 'distributor') {
            discountType = 'fixed_rate';
            unitBasePricePaise = userPriceRule.distributor_rate_paise || unitBasePricePaise;
            discountValue = Math.max(0, baseMrpPaise - unitBasePricePaise);
          } else if (userPriceRule.rule_type === 'fixed_dealer_rate' && buyer_type === 'dealer') {
            discountType = 'fixed_rate';
            unitBasePricePaise = userPriceRule.dealer_rate_paise || unitBasePricePaise;
            discountValue = Math.max(0, baseMrpPaise - unitBasePricePaise);
          } else if (userPriceRule.rule_type === 'percentage_discount') {
            discountType = 'percentage';
            discountValue = userPriceRule.discount_percentage || 0;
            unitBasePricePaise = Math.round(baseMrpPaise * (1 - discountValue / 100));
          } else if (userPriceRule.rule_type === 'fixed_discount') {
            discountType = 'fixed';
            discountValue = userPriceRule.discount_fixed_paise || 0;
            unitBasePricePaise = Math.max(0, baseMrpPaise - discountValue);
          }
          if (userPriceRule.moq) resolvedMoq = userPriceRule.moq;
        }
      }

      // 3. District Channel Rule
      if (!appliedRule && district_id) {
        const districtChannel = channelSettings.find(
          (cs) => cs.district_id && cs.district_id.toString() === district_id.toString()
        );
        if (districtChannel) {
          const prodConfig = districtChannel.product_configs?.find(
            (pc) => pc.product_id && pc.product_id.toString() === prodIdStr
          );
          if (prodConfig) {
            appliedRule = districtChannel;
            appliedScope = 'district_channel';
            if (prodConfig.mrp_paise) baseMrpPaise = prodConfig.mrp_paise;
            if (prodConfig.gst_rate_pct !== undefined) gstRatePct = prodConfig.gst_rate_pct;
            if (buyer_type === 'distributor' && prodConfig.distributor_rate_paise) {
              discountType = 'fixed_rate';
              unitBasePricePaise = prodConfig.distributor_rate_paise;
              discountValue = Math.max(0, baseMrpPaise - unitBasePricePaise);
              if (prodConfig.distributor_moq) resolvedMoq = prodConfig.distributor_moq;
            } else if (buyer_type === 'dealer' && prodConfig.dealer_rate_paise) {
              discountType = 'fixed_rate';
              unitBasePricePaise = prodConfig.dealer_rate_paise;
              discountValue = Math.max(0, baseMrpPaise - unitBasePricePaise);
              if (prodConfig.dealer_moq) resolvedMoq = prodConfig.dealer_moq;
            }
          }
        }
      }

      // 4. State Channel Rule
      if (!appliedRule && state_id) {
        const stateChannel = channelSettings.find(
          (cs) => cs.state_id && cs.state_id.toString() === state_id.toString()
        );
        if (stateChannel) {
          const prodConfig = stateChannel.product_configs?.find(
            (pc) => pc.product_id && pc.product_id.toString() === prodIdStr
          );
          if (prodConfig) {
            appliedRule = stateChannel;
            appliedScope = 'state_channel';
            if (prodConfig.mrp_paise) baseMrpPaise = prodConfig.mrp_paise;
            if (prodConfig.gst_rate_pct !== undefined) gstRatePct = prodConfig.gst_rate_pct;
            if (buyer_type === 'distributor' && prodConfig.distributor_rate_paise) {
              discountType = 'fixed_rate';
              unitBasePricePaise = prodConfig.distributor_rate_paise;
              discountValue = Math.max(0, baseMrpPaise - unitBasePricePaise);
              if (prodConfig.distributor_moq) resolvedMoq = prodConfig.distributor_moq;
            } else if (buyer_type === 'dealer' && prodConfig.dealer_rate_paise) {
              discountType = 'fixed_rate';
              unitBasePricePaise = prodConfig.dealer_rate_paise;
              discountValue = Math.max(0, baseMrpPaise - unitBasePricePaise);
              if (prodConfig.dealer_moq) resolvedMoq = prodConfig.dealer_moq;
            }
          }
        }
      }

      // 5. Project-Type & Industry Channel Rule
      if (!appliedRule && (project_type_id || industry_type_id)) {
        const indProjChannel = channelSettings.find(
          (cs) =>
            (project_type_id && cs.project_type_id && cs.project_type_id.toString() === project_type_id.toString()) ||
            (industry_type_id && cs.industry_type_id && cs.industry_type_id.toString() === industry_type_id.toString())
        );
        if (indProjChannel) {
          const prodConfig = indProjChannel.product_configs?.find(
            (pc) => pc.product_id && pc.product_id.toString() === prodIdStr
          );
          if (prodConfig) {
            appliedRule = indProjChannel;
            appliedScope = 'industry_project_channel';
            if (prodConfig.mrp_paise) baseMrpPaise = prodConfig.mrp_paise;
            if (prodConfig.gst_rate_pct !== undefined) gstRatePct = prodConfig.gst_rate_pct;
            if (buyer_type === 'distributor' && prodConfig.distributor_rate_paise) {
              discountType = 'fixed_rate';
              unitBasePricePaise = prodConfig.distributor_rate_paise;
              discountValue = Math.max(0, baseMrpPaise - unitBasePricePaise);
              if (prodConfig.distributor_moq) resolvedMoq = prodConfig.distributor_moq;
            }
          }
        }
      }

      // 6. Plan Tier Rule (from Distributor Plan)
      if (!appliedRule && planDoc) {
        appliedRule = planDoc;
        appliedScope = 'distributor_plan';
        if (buyer_type === 'distributor') {
          const pct = planDoc.discount_percentage || planDoc.distributor_margin_slab_min || 10;
          discountType = 'percentage';
          discountValue = pct;
          unitBasePricePaise = Math.round(baseMrpPaise * (1 - pct / 100));
          if (planDoc.distributor_default_moq) resolvedMoq = planDoc.distributor_default_moq;
        } else if (buyer_type === 'dealer') {
          const pct = 8;
          discountType = 'percentage';
          discountValue = pct;
          unitBasePricePaise = Math.round(baseMrpPaise * (1 - pct / 100));
          if (planDoc.dealer_default_moq) resolvedMoq = planDoc.dealer_default_moq;
        }
      }

      // 7. General Price Rule Fallback (Category/Product slabs)
      if (!appliedRule) {
        const generalRule = priceRules.find(
          (pr) =>
            (!pr.channel || pr.channel === buyer_type || pr.channel === 'all') &&
            (!pr.product_id || pr.product_id.toString() === prodIdStr) &&
            (!pr.min_quantity || quantity >= pr.min_quantity)
        );
        if (generalRule) {
          appliedRule = generalRule;
          appliedScope = generalRule.scope || 'general_price_rule';
          if (generalRule.rule_type === 'percentage_discount') {
            discountType = 'percentage';
            discountValue = generalRule.discount_percentage || 0;
            unitBasePricePaise = Math.round(baseMrpPaise * (1 - discountValue / 100));
          } else if (generalRule.rule_type === 'fixed_discount') {
            discountType = 'fixed';
            discountValue = generalRule.discount_fixed_paise || 0;
            unitBasePricePaise = Math.max(0, baseMrpPaise - discountValue);
          } else if (generalRule.rule_type === 'fixed_distributor_rate' && buyer_type === 'distributor') {
            discountType = 'fixed_rate';
            unitBasePricePaise = generalRule.distributor_rate_paise || unitBasePricePaise;
            discountValue = Math.max(0, baseMrpPaise - unitBasePricePaise);
          }
          if (generalRule.moq) resolvedMoq = generalRule.moq;
        }
      }

      // 8. Product Default (if no rule matched)
      if (!appliedRule) {
        if (buyer_type === 'distributor') {
          discountType = 'percentage';
          discountValue = 15; // 15% default distributor wholesale margin
          unitBasePricePaise = Math.round(baseMrpPaise * 0.85);
          resolvedMoq = Math.max(resolvedMoq, 5);
        } else if (buyer_type === 'dealer') {
          discountType = 'percentage';
          discountValue = 10; // 10% default dealer margin
          unitBasePricePaise = Math.round(baseMrpPaise * 0.90);
          resolvedMoq = Math.max(resolvedMoq, 2);
        } else {
          discountType = 'percentage';
          discountValue = 0;
          unitBasePricePaise = baseMrpPaise;
          resolvedMoq = 1;
        }
      }

      // Resolve Tax Rule override if present in boskit_tax_rules
      const matchedTaxRule = taxRules.find(
        (tr) =>
          (tr.product_id && tr.product_id.toString() === prodIdStr) ||
          (tr.category_id && prod.category_id && tr.category_id.toString() === prod.category_id.toString()) ||
          tr.scope === 'global'
      );
      if (matchedTaxRule?.total_gst_pct !== undefined) {
        gstRatePct = matchedTaxRule.total_gst_pct;
      }

      // Resolve MOQ Rule override if present in boskit_moq_rules
      const matchedMoqRule = moqRules.find(
        (mr) =>
          (!mr.channel || mr.channel === buyer_type) &&
          ((mr.product_id && mr.product_id.toString() === prodIdStr) ||
            (mr.distributor_id && buyer_id && mr.distributor_id.toString() === buyer_id.toString()))
      );
      if (matchedMoqRule?.moq) {
        resolvedMoq = matchedMoqRule.moq;
      }

      // Ensure unit price is never negative
      unitBasePricePaise = Math.max(0, unitBasePricePaise);
      const unitDiscountPaise = Math.max(0, baseMrpPaise - unitBasePricePaise);

      // Line calculations
      const lineBaseTotalPaise = baseMrpPaise * quantity;
      const lineDiscountTotalPaise = unitDiscountPaise * quantity;
      const lineTaxablePaise = unitBasePricePaise * quantity;

      // GST Calculation
      const lineTaxAmountPaise = Math.round((lineTaxablePaise * gstRatePct) / 100);
      let lineCgstPaise = 0;
      let lineSgstPaise = 0;
      let lineIgstPaise = 0;

      if (isInterstate) {
        lineIgstPaise = lineTaxAmountPaise;
      } else {
        lineCgstPaise = Math.round(lineTaxAmountPaise / 2);
        lineSgstPaise = lineTaxAmountPaise - lineCgstPaise; // Exact balance
      }

      const lineGrandTotalPaise = lineTaxablePaise + lineTaxAmountPaise;
      const moqMet = quantity >= resolvedMoq;

      if (!moqMet) {
        moqErrors.push({
          product_id: item.product_id,
          product_name: prod.name || `Item #${index + 1}`,
          ordered_qty: quantity,
          min_order_qty: resolvedMoq,
          message: `Minimum order quantity for ${prod.name || 'this item'} is ${resolvedMoq} units.`,
        });
      }

      // Accumulate
      subtotalPaise += lineBaseTotalPaise;
      totalDiscountPaise += lineDiscountTotalPaise;
      netTaxablePaise += lineTaxablePaise;
      totalCgstPaise += lineCgstPaise;
      totalSgstPaise += lineSgstPaise;
      totalIgstPaise += lineIgstPaise;
      totalTaxPaise += lineTaxAmountPaise;

      return {
        product_id: item.product_id,
        product_name: prod.name || 'Solar Kit Component',
        sku: prod.sku || `BK-SKU-${index + 1}`,
        quantity,
        moq: resolvedMoq,
        moq_met: moqMet,
        unit_mrp_paise: baseMrpPaise,
        unit_discount_paise: unitDiscountPaise,
        unit_base_price_paise: unitBasePricePaise,
        discount_type: discountType,
        discount_value: discountValue,
        applied_rule_id: appliedRule?._id || appliedRule?.id || null,
        applied_rule_scope: appliedScope,
        applied_rule_name: appliedRule?.rule_name || appliedRule?.name || appliedScope,
        line_base_total_paise: lineBaseTotalPaise,
        line_discount_paise: lineDiscountTotalPaise,
        line_taxable_paise: lineTaxablePaise,
        gst_rate_percent: gstRatePct,
        cgst_paise: lineCgstPaise,
        sgst_paise: lineSgstPaise,
        igst_paise: lineIgstPaise,
        total_tax_paise: lineTaxAmountPaise,
        unit_final_price_paise: Math.round(lineGrandTotalPaise / quantity),
        line_grand_total_paise: lineGrandTotalPaise,
        line_grand_total_inr: Math.round(lineGrandTotalPaise / 100),
        validation_message: moqMet ? 'Eligible' : `Quantity below MOQ (${resolvedMoq})`,
      };
    });

    const shippingPaise = netTaxablePaise > 5000000 ? 0 : 250000; // Free delivery above ₹50k taxable, else ₹2,500
    const grandTotalPaise = netTaxablePaise + totalTaxPaise + shippingPaise;

    return {
      items: calculatedItems,
      summary: {
        subtotal_paise: subtotalPaise,
        subtotal_inr: Math.round(subtotalPaise / 100),
        total_discount_paise: totalDiscountPaise,
        total_discount_inr: Math.round(totalDiscountPaise / 100),
        net_taxable_paise: netTaxablePaise,
        net_taxable_inr: Math.round(netTaxablePaise / 100),
        cgst_paise: totalCgstPaise,
        cgst_inr: Math.round(totalCgstPaise / 100),
        sgst_paise: totalSgstPaise,
        sgst_inr: Math.round(totalSgstPaise / 100),
        igst_paise: totalIgstPaise,
        igst_inr: Math.round(totalIgstPaise / 100),
        total_tax_paise: totalTaxPaise,
        total_tax_inr: Math.round(totalTaxPaise / 100),
        shipping_paise: shippingPaise,
        shipping_inr: Math.round(shippingPaise / 100),
        grand_total_paise: grandTotalPaise,
        grand_total_inr: Math.round(grandTotalPaise / 100),
        is_interstate: isInterstate,
        origin_state_code,
        destination_state_code,
        buyer_type,
      },
      moq_passed: moqErrors.length === 0,
      moq_errors: moqErrors,
    };
  }
}

module.exports = PricingEngine;
