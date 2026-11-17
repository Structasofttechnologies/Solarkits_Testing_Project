const { WarehouseTriggerConfig, WarehouseOpportunity } = require('../models/india_solarshop_db/warehouse_finance.schema');
let FranchiseeCluster = null;
try {
  FranchiseeCluster = require('../../admin-panel/models/india_solarshop_db').FranchiseeCluster;
} catch (e) {
  console.warn("Notice loading FranchiseeCluster in warehouse_finance.module.handler:", e.message);
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

const SEED_OPPORTUNITIES = [
  {
    cluster_name: 'Varanasi-Purvanchal Cluster',
    cluster_code: 'CLU-UP-001',
    state: 'Uttar Pradesh',
    district: 'Varanasi',
    current_monthly_turnover: 3450000,
    current_monthly_kits: 58,
    pipeline_order_value: 5200000,
    active_epc_count: 24,
    current_avg_delivery_tat_days: 6.2,
    current_delivery_cost_pct: 8.4,
    projected_monthly_delivery_savings: 185000,
    projected_tat_reduction_days: 4.5,
    growth_score: 94,
    status: 'OPPORTUNITY_IDENTIFIED',
    admin_notes: 'PM Surya Ghar scheme high uptake. High inter-state transit costs from Delhi hub.'
  },
  {
    cluster_name: 'Devbhumi Dwarka cluster',
    cluster_code: 'CLU-GJ-001',
    state: 'Gujarat',
    district: 'Devbhumi Dwarka',
    current_monthly_turnover: 3200000,
    current_monthly_kits: 51,
    pipeline_order_value: 4900000,
    active_epc_count: 21,
    current_avg_delivery_tat_days: 6.0,
    current_delivery_cost_pct: 8.1,
    projected_monthly_delivery_savings: 175000,
    projected_tat_reduction_days: 4.0,
    growth_score: 95,
    status: 'OPPORTUNITY_IDENTIFIED',
    admin_notes: 'Coastal territory delivery bottlenecks. Severe TAT lag exceeding 4 days national policy.'
  },
  {
    cluster_name: 'Porbandar Cluster',
    cluster_code: 'CLU-GJ-002',
    state: 'Gujarat',
    district: 'Porbandar',
    current_monthly_turnover: 2950000,
    current_monthly_kits: 44,
    pipeline_order_value: 4300000,
    active_epc_count: 18,
    current_avg_delivery_tat_days: 5.6,
    current_delivery_cost_pct: 7.8,
    projected_monthly_delivery_savings: 155000,
    projected_tat_reduction_days: 3.5,
    growth_score: 91,
    status: 'OPPORTUNITY_IDENTIFIED',
    admin_notes: 'Saurashtra delivery costs exceed 6.5% threshold. High kit order pipeline.'
  },
  {
    cluster_name: 'Pune & Western Maharashtra Cluster',
    cluster_code: 'CLU-MH-001',
    state: 'Maharashtra',
    district: 'Pune',
    current_monthly_turnover: 4200000,
    current_monthly_kits: 68,
    pipeline_order_value: 6500000,
    active_epc_count: 32,
    current_avg_delivery_tat_days: 3.1,
    current_delivery_cost_pct: 4.9,
    projected_monthly_delivery_savings: 210000,
    projected_tat_reduction_days: 2.0,
    growth_score: 96,
    status: 'UNDER_FINANCIAL_REVIEW',
    admin_notes: 'Healthy logistics node with excellent TAT. Prime candidate for debt-financed warehouse facility.'
  },
  {
    cluster_name: 'Indore-Malwa Cluster',
    cluster_code: 'CLU-MP-001',
    state: 'Madhya Pradesh',
    district: 'Indore',
    current_monthly_turnover: 2890000,
    current_monthly_kits: 46,
    pipeline_order_value: 4400000,
    active_epc_count: 19,
    current_avg_delivery_tat_days: 5.5,
    current_delivery_cost_pct: 7.2,
    projected_monthly_delivery_savings: 140000,
    projected_tat_reduction_days: 3.5,
    growth_score: 88,
    status: 'UNDER_FINANCIAL_REVIEW',
    admin_notes: 'Central logistics junction. Fast growing EPC base.'
  },
  {
    cluster_name: 'Jaipur-Marwar Cluster',
    cluster_code: 'CLU-RJ-001',
    state: 'Rajasthan',
    district: 'Jaipur',
    current_monthly_turnover: 3100000,
    current_monthly_kits: 52,
    pipeline_order_value: 4800000,
    active_epc_count: 22,
    current_avg_delivery_tat_days: 4.8,
    current_delivery_cost_pct: 6.9,
    projected_monthly_delivery_savings: 125000,
    projected_tat_reduction_days: 3.0,
    growth_score: 85,
    status: 'OPPORTUNITY_IDENTIFIED',
    admin_notes: 'Direct proximity to module manufacturers. High potential for commercial rooftop solar.'
  },
  {
    cluster_name: 'Rajkot Cluster',
    cluster_code: 'CLU-GJ-003',
    state: 'Gujarat',
    district: 'Rajkot',
    current_monthly_turnover: 2100000,
    current_monthly_kits: 28,
    pipeline_order_value: 3200000,
    active_epc_count: 12,
    current_avg_delivery_tat_days: 3.6,
    current_delivery_cost_pct: 5.4,
    projected_monthly_delivery_savings: 80000,
    projected_tat_reduction_days: 1.5,
    growth_score: 74,
    status: 'DEVELOPING',
    admin_notes: 'Turnover building steadily. Below trigger volume.'
  }
];

async function ensureTriggerData() {
  const cfgCount = await WarehouseTriggerConfig.countDocuments();
  if (cfgCount === 0) {
    await WarehouseTriggerConfig.create(DEFAULT_TRIGGER_CONFIG);
  }
  const cfg = await WarehouseTriggerConfig.findOne().lean() || DEFAULT_TRIGGER_CONFIG;

  // Sync Franchisee Clusters if model exists
  if (FranchiseeCluster) {
    try {
      const liveClusters = await FranchiseeCluster.find({ deleted_at: null }).lean();
      for (const fc of liveClusters) {
        const exists = await WarehouseOpportunity.findOne({
          $or: [
            { cluster_name: fc.cluster_name },
            { cluster_code: fc.cluster_code }
          ]
        });
        if (!exists) {
          const matchedSeed = SEED_OPPORTUNITIES.find(s => s.cluster_name.toLowerCase() === fc.cluster_name.toLowerCase());
          const newOpp = matchedSeed || {
            cluster_name: fc.cluster_name,
            cluster_code: fc.cluster_code,
            state: fc.state_name || 'Gujarat',
            district: fc.district_names?.[0] || 'Main Hub',
            current_monthly_turnover: 2600000,
            current_monthly_kits: 42,
            pipeline_order_value: 3900000,
            active_epc_count: 16,
            current_avg_delivery_tat_days: 5.2,
            current_delivery_cost_pct: 7.1,
            projected_monthly_delivery_savings: 140000,
            projected_tat_reduction_days: 3.0,
            growth_score: 82,
            status: 'OPPORTUNITY_IDENTIFIED',
            admin_notes: `Synced from Franchise Cluster Management (${fc.cluster_code}).`
          };
          calculateOpportunityFinancials(newOpp, cfg);
          await WarehouseOpportunity.create(newOpp);
        }
      }
    } catch (err) {
      console.warn("Notice syncing FranchiseeCluster in ensureTriggerData:", err.message);
    }
  }

  const oppCount = await WarehouseOpportunity.countDocuments();
  if (oppCount === 0) {
    for (const opp of SEED_OPPORTUNITIES) {
      calculateOpportunityFinancials(opp, cfg);
      await WarehouseOpportunity.create(opp);
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

// 4. Create / Evaluate New Warehouse Opportunity
exports.create_warehouse_opportunity = async (req, res) => {
  try {
    const cfg = await WarehouseTriggerConfig.findOne({ is_active: true }).lean() || DEFAULT_TRIGGER_CONFIG;
    const oppData = { ...req.body };
    calculateOpportunityFinancials(oppData, cfg);

    const opportunity = await WarehouseOpportunity.create(oppData);
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

// 4. Create / Evaluate New Warehouse Opportunity
exports.create_warehouse_opportunity = async (req, res) => {
  try {
    const cfg = await WarehouseTriggerConfig.findOne({ is_active: true }).lean() || DEFAULT_TRIGGER_CONFIG;
    const oppData = { ...req.body };
    calculateOpportunityFinancials(oppData, cfg);

    const opportunity = await WarehouseOpportunity.create(oppData);
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
