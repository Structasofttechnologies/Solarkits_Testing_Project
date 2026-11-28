const { WarehouseTriggerConfig, WarehouseOpportunity } = require('../models/india_solarshop_db/warehouse_finance.schema');
let FranchiseeCluster = null;
let EpcAccount = null;
try {
  const indiaDb = require('../../admin-panel/models/india_solarshop_db');
  FranchiseeCluster = indiaDb.FranchiseeCluster;
  EpcAccount = indiaDb.EpcAccount;
} catch (e) {
  console.warn("Notice loading models in warehouse_finance.module.handler:", e.message);
}

// Initial seed default triggers & cluster opportunities if empty
const DEFAULT_TRIGGER_CONFIG = {
  config_name: 'SOLARKITS National Expansion Policy 2026',
  min_monthly_sales_inr: 2500000,
  min_monthly_kits_sold: 40,
  min_pipeline_order_value_inr: 4000000,
  min_active_epc_partners: 15,
  max_delivery_cost_ratio_pct: 6.5,
  max_delivery_tat_days: 4,
  estimated_civil_setup_cost: 1200000,
  estimated_equipment_handling_cost: 800000,
  estimated_working_capital_buffer: 2500000,
  estimated_it_surveillance_cost: 300000,
  estimated_statutory_licenses_cost: 100000,
  monthly_rent_estimate: 75000,
  monthly_manpower_estimate: 120000,
  monthly_utility_security_estimate: 45000,
  indicative_bank_loan_interest_pct: 10.5,
  indicative_loan_tenure_months: 60,
  min_dscr_threshold: 1.35
};


async function ensureTriggerData() {
  const cfgCount = await WarehouseTriggerConfig.countDocuments();
  if (cfgCount === 0) {
    await WarehouseTriggerConfig.create(DEFAULT_TRIGGER_CONFIG);
  }
  const cfg = await WarehouseTriggerConfig.findOne().lean() || DEFAULT_TRIGGER_CONFIG;

  // Sync strictly with live Franchisee Clusters
  if (FranchiseeCluster) {
    try {
      const liveClusters = await FranchiseeCluster.find({ deleted_at: null }).lean();
      const liveClusterIds = liveClusters.map(fc => fc._id.toString());
      const liveClusterNames = liveClusters.map(fc => fc.cluster_name);

      // Clean out any opportunities that do not correspond to active Franchise Clusters
      await WarehouseOpportunity.deleteMany({
        $or: [
          { cluster_id: { $nin: liveClusterIds } },
          { cluster_name: { $nin: liveClusterNames } }
        ]
      });

      for (const fc of liveClusters) {
        let epcCount = 0;
        if (EpcAccount) {
          try {
            epcCount = await EpcAccount.countDocuments({
              districts: { $in: fc.district_ids || [] },
              status: 'approved',
              deleted_at: null
            });
          } catch (e) { }
        }

        let opp = await WarehouseOpportunity.findOne({ cluster_id: fc._id });
        if (!opp) {
          opp = await WarehouseOpportunity.findOne({ cluster_name: fc.cluster_name });
        }

        if (!opp) {
          const newOpp = {
            cluster_id: fc._id,
            cluster_code: fc.cluster_code,
            cluster_name: fc.cluster_name,
            state: fc.state_name || 'Gujarat',
            district: fc.district_names?.[0] || 'Main Hub',
            district_names: fc.district_names || [],
            current_monthly_turnover: 0,
            current_monthly_kits: 0,
            pipeline_order_value: 0,
            active_epc_count: epcCount,
            current_avg_delivery_tat_days: 0,
            current_delivery_cost_pct: 0,
            projected_monthly_delivery_savings: 0,
            projected_tat_reduction_days: 0,
            growth_score: 0,
            status: 'DEVELOPING',
            admin_notes: `Live synced with Franchise Cluster Management (${fc.cluster_code}).`
          };
          calculateOpportunityFinancials(newOpp, cfg);
          await WarehouseOpportunity.create(newOpp);
        } else {
          let changed = false;
          if (!opp.cluster_id || opp.cluster_id.toString() !== fc._id.toString()) {
            opp.cluster_id = fc._id;
            changed = true;
          }
          if (opp.cluster_code !== fc.cluster_code) {
            opp.cluster_code = fc.cluster_code;
            changed = true;
          }
          if (opp.state !== fc.state_name) {
            opp.state = fc.state_name;
            changed = true;
          }
          if (epcCount > 0 && opp.active_epc_count !== epcCount) {
            opp.active_epc_count = epcCount;
            changed = true;
          }
          if (changed) {
            calculateOpportunityFinancials(opp, cfg);
            await opp.save();
          }
        }
      }
    } catch (err) {
      console.warn("Notice syncing FranchiseeCluster in ensureTriggerData:", err.message);
    }
  }

}

function calculateOpportunityFinancials(opp, cfg) {
  // Setup breakdown
  const civil = cfg.estimated_civil_setup_cost || 1200000;
  const equip = cfg.estimated_equipment_handling_cost || 800000;
  const buffer = cfg.estimated_working_capital_buffer || 2500000;
  const it = cfg.estimated_it_surveillance_cost || 300000;
  const licenses = cfg.estimated_statutory_licenses_cost || 100000;
  const totalSetup = civil + equip + buffer + it + licenses;

  opp.investment_breakdown = {
    civil_setup: civil,
    equipment_handling: equip,
    working_capital_buffer: buffer,
    it_surveillance: it,
    statutory_licenses: licenses,
    total_setup_investment: totalSetup
  };

  // Monthly opex
  const rent = cfg.monthly_rent_estimate || 75000;
  const manpower = cfg.monthly_manpower_estimate || 120000;
  const util = cfg.monthly_utility_security_estimate || 45000;
  const totalOpex = rent + manpower + util;

  opp.monthly_opex = {
    rent,
    manpower,
    utilities_security: util,
    total_monthly_opex: totalOpex
  };

  // Loan computation (70% Debt, 30% Equity)
  const loanAmount = Math.round(totalSetup * 0.70);
  const equityAmount = totalSetup - loanAmount;
  opp.company_contribution_equity = equityAmount;
  opp.recommended_bank_loan_amount = loanAmount;

  // Monthly EMI formula: P * r * (1+r)^n / ((1+r)^n - 1)
  const annualRate = (cfg.indicative_bank_loan_interest_pct || 10.5) / 100;
  const r = annualRate / 12;
  const n = cfg.indicative_loan_tenure_months || 60;
  const emi = Math.round((loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
  opp.indicative_monthly_emi = emi;

  // Projected profit & DSCR
  const projectedMonthlyRevenue = (opp.current_monthly_turnover || 2500000) * 1.25;
  const grossProfitMargin = 0.18; // 18% gross margin
  const projectedGrossProfit = projectedMonthlyRevenue * grossProfitMargin;
  const monthlySavings = opp.projected_monthly_delivery_savings || 150000;
  const operatingProfitBeforeEmi = (projectedGrossProfit + monthlySavings) - totalOpex;
  const projectedNetProfit = operatingProfitBeforeEmi - emi;

  opp.projected_monthly_net_profit = Math.round(projectedNetProfit);
  // DSCR = Operating Profit Before Debt / Monthly EMI
  opp.estimated_dscr = emi > 0 ? parseFloat((operatingProfitBeforeEmi / emi).toFixed(2)) : 2.5;
  opp.payback_period_months = operatingProfitBeforeEmi > 0 ? Math.round(totalSetup / operatingProfitBeforeEmi) : 36;
}

// 1. Get Trigger Config
exports.get_trigger_config = async (req, res) => {
  try {
    await ensureTriggerData();
    const config = await WarehouseTriggerConfig.findOne({ is_active: true }).lean();
    return res.status(200).json({ status: 'success', data: config });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// 2. Update Trigger Config
exports.update_trigger_config = async (req, res) => {
  try {
    const config = await WarehouseTriggerConfig.findOneAndUpdate(
      { is_active: true },
      req.body,
      { new: true, upsert: true }
    );
    return res.status(200).json({ status: 'success', message: 'Warehouse trigger configuration updated successfully.', data: config });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// 3. Get Warehouse Opportunities & Recommendations with Dynamic Trigger Rules Evaluation
exports.get_warehouse_opportunities = async (req, res) => {
  try {
    await ensureTriggerData();
    const cfg = await WarehouseTriggerConfig.findOne({ is_active: true }).lean() || DEFAULT_TRIGGER_CONFIG;

    const filter = {};
    if (req.query.state && req.query.state !== 'ALL') {
      filter.state = req.query.state;
    }
    if (req.query.cluster_name && req.query.cluster_name !== 'ALL') {
      filter.cluster_name = req.query.cluster_name;
    }

    const rawOpportunities = await WarehouseOpportunity.find(filter).sort({ growth_score: -1 }).lean();

    const minSales = Number(cfg.min_monthly_sales_inr || 2500000);
    const minKits = Number(cfg.min_monthly_kits_sold || 40);
    const maxTat = Number(cfg.max_delivery_tat_days || 4);
    const maxCost = Number(cfg.max_delivery_cost_ratio_pct || 6.5);

    // Evaluate dynamic trigger conditions on every cluster
    const evaluated = rawOpportunities.map((opp) => {
      const isSalesMet = (opp.current_monthly_turnover || 0) >= minSales;
      const isKitsMet = (opp.current_monthly_kits || 0) >= minKits;
      const isVolumeMet = isSalesMet || isKitsMet;

      const isTatBreached = (opp.current_avg_delivery_tat_days || 0) > maxTat;
      const isCostBreached = (opp.current_delivery_cost_pct || 0) > maxCost;
      const isLogisticsIssue = isTatBreached || isCostBreached;

      let trigger_status = 'DEVELOPING';
      let trigger_color = 'slate';
      let trigger_badge = 'Developing Cluster';
      let trigger_headline = 'Volume Building (Below National Threshold)';
      let recommendation = 'Maintain regular logistics monitoring. Volume below warehouse trigger.';

      if (isVolumeMet) {
        if (isLogisticsIssue) {
          trigger_status = 'CRITICAL_WAREHOUSE_NEEDED';
          trigger_color = 'red';
          trigger_badge = '🚨 CRITICAL: Warehouse Setup Needed (SLA/Cost Breach)';
          trigger_headline = `Urgent Logistics Fire: TAT (${opp.current_avg_delivery_tat_days}d > ${maxTat}d) or Freight (${opp.current_delivery_cost_pct}% > ${maxCost}%) exceeding threshold!`;
          recommendation = `Establish new warehouse in ${opp.cluster_name} immediately to eliminate ${opp.current_avg_delivery_tat_days}d delivery lag and save ₹${Number(opp.projected_monthly_delivery_savings || 150000).toLocaleString('en-IN')}/mo in transit leakage.`;
        } else {
          trigger_status = 'HEALTHY_GROWTH_TARGET';
          trigger_color = 'green';
          trigger_badge = '✅ TARGET MET: Healthy Operations (Expansion Loan Eligible)';
          trigger_headline = `Optimal Logistics Node: Volume target met with on-time delivery (${opp.current_avg_delivery_tat_days}d <= ${maxTat}d) & freight under control (${opp.current_delivery_cost_pct}% <= ${maxCost}%).`;
          recommendation = `Approved candidate for institutional debt-financed warehouse facility. DSCR ${opp.estimated_dscr || 2.5}x satisfies banking covenants.`;
        }
      }

      return {
        ...opp,
        is_sales_met: isSalesMet,
        is_kits_met: isKitsMet,
        is_volume_met: isVolumeMet,
        is_tat_breached: isTatBreached,
        is_cost_breached: isCostBreached,
        is_logistics_issue: isLogisticsIssue,
        trigger_status,
        trigger_color,
        trigger_badge,
        trigger_headline,
        recommendation,
        threshold_rules_applied: {
          min_monthly_sales_inr: minSales,
          min_monthly_kits_sold: minKits,
          max_delivery_tat_days: maxTat,
          max_delivery_cost_ratio_pct: maxCost
        }
      };
    });

    return res.status(200).json({ status: 'success', data: evaluated, config: cfg });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// 4. Create / Evaluate New Warehouse Opportunity (Restricted to Franchise Clusters)
exports.create_warehouse_opportunity = async (req, res) => {
  try {
    const cfg = await WarehouseTriggerConfig.findOne({ is_active: true }).lean() || DEFAULT_TRIGGER_CONFIG;
    const oppData = { ...req.body };

    if (!oppData.cluster_id && FranchiseeCluster) {
      const fc = await FranchiseeCluster.findOne({
        $or: [{ cluster_name: oppData.cluster_name }, { cluster_code: oppData.cluster_code }],
        deleted_at: null
      }).lean();
      if (fc) {
        oppData.cluster_id = fc._id;
        oppData.cluster_code = fc.cluster_code;
        oppData.state = fc.state_name;
        oppData.district = fc.district_names?.[0] || 'Main Hub';
        oppData.district_names = fc.district_names || [];
      } else {
        return res.status(400).json({
          status: 'error',
          message: `Cluster "${oppData.cluster_name}" does not exist in Franchise Clusters. Only franchise clusters can be evaluated.`
        });
      }
    }

    calculateOpportunityFinancials(oppData, cfg);

    const opportunity = await WarehouseOpportunity.findOneAndUpdate(
      { cluster_id: oppData.cluster_id },
      oppData,
      { upsert: true, new: true, runValidators: true }
    );

    return res.status(201).json({
      status: 'success',
      message: `Warehouse opportunity for ${opportunity.cluster_name} evaluated successfully!`,
      data: opportunity
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// 5. Update Opportunity Status (e.g. Approved for Expansion, Shelved)
exports.update_opportunity_status = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;
    const updated = await WarehouseOpportunity.findByIdAndUpdate(
      id,
      { status, admin_notes },
      { new: true }
    );
    return res.status(200).json({ status: 'success', message: 'Opportunity status updated.', data: updated });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};
