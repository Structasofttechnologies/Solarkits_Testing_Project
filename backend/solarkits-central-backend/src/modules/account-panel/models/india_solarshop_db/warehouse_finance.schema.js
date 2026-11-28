const mongoose = require('mongoose');

// Trigger parameters configured by Admin
const warehouseTriggerConfigSchema = new mongoose.Schema({
  config_name: { type: String, default: 'Standard Warehouse Triggers' },
  min_monthly_sales_inr: { type: Number, default: 2500000 }, // e.g. 25 Lakhs / month
  min_monthly_kits_sold: { type: Number, default: 40 }, // 40 Solar Kits / month
  min_pipeline_order_value_inr: { type: Number, default: 4000000 }, // 40 Lakhs pipeline
  min_active_epc_partners: { type: Number, default: 15 },
  max_delivery_cost_ratio_pct: { type: Number, default: 6.5 }, // Delivery cost > 6.5% of order value triggers need for local warehouse
  max_delivery_tat_days: { type: Number, default: 4 }, // TAT > 4 days triggers warehouse recommendation
  
  // Standard investment estimates (in INR)
  estimated_civil_setup_cost: { type: Number, default: 1200000 },
  estimated_equipment_handling_cost: { type: Number, default: 800000 },
  estimated_working_capital_buffer: { type: Number, default: 2500000 },
  estimated_it_surveillance_cost: { type: Number, default: 300000 },
  estimated_statutory_licenses_cost: { type: Number, default: 100000 },
  
  // Standard operating costs (in INR / month)
  monthly_rent_estimate: { type: Number, default: 75000 },
  monthly_manpower_estimate: { type: Number, default: 120000 },
  monthly_utility_security_estimate: { type: Number, default: 45000 },
  
  // Loan assessment parameters
  indicative_bank_loan_interest_pct: { type: Number, default: 10.5 },
  indicative_loan_tenure_months: { type: Number, default: 60 },
  min_dscr_threshold: { type: Number, default: 1.35 }, // Debt Service Coverage Ratio
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

// Warehouse Opportunity identified by evaluating real cluster metrics
const warehouseOpportunitySchema = new mongoose.Schema({
  cluster_name: { type: String, required: true, trim: true },
  cluster_id: { type: mongoose.Schema.Types.ObjectId, ref: 'franchisee_clusters', required: true, unique: true, index: true },
  cluster_code: { type: String, required: true, trim: true },
  state: { type: String, required: true },
  district: { type: String },
  district_names: [{ type: String }],
  
  // Actual cluster metrics evaluated
  current_monthly_turnover: { type: Number, default: 0 },
  current_monthly_kits: { type: Number, default: 0 },
  pipeline_order_value: { type: Number, default: 0 },
  active_epc_count: { type: Number, default: 0 },
  current_avg_delivery_tat_days: { type: Number, default: 0 },
  current_delivery_cost_pct: { type: Number, default: 0 },
  
  // Projected improvements
  projected_monthly_delivery_savings: { type: Number, default: 0 },
  projected_tat_reduction_days: { type: Number, default: 0 },
  projected_monthly_revenue_growth_pct: { type: Number, default: 25 },
  
  // Estimated Total Investment Breakdown
  investment_breakdown: {
    civil_setup: { type: Number, default: 0 },
    equipment_handling: { type: Number, default: 0 },
    working_capital_buffer: { type: Number, default: 0 },
    it_surveillance: { type: Number, default: 0 },
    statutory_licenses: { type: Number, default: 0 },
    total_setup_investment: { type: Number, default: 0 }
  },
  
  // Estimated Operating Costs
  monthly_opex: {
    rent: { type: Number, default: 0 },
    manpower: { type: Number, default: 0 },
    utilities_security: { type: Number, default: 0 },
    total_monthly_opex: { type: Number, default: 0 }
  },

  // Financing & Loan Eligibility
  company_contribution_equity: { type: Number, default: 0 }, // internal accruals
  recommended_bank_loan_amount: { type: Number, default: 0 },
  indicative_monthly_emi: { type: Number, default: 0 },
  projected_monthly_net_profit: { type: Number, default: 0 },
  estimated_dscr: { type: Number, default: 0 },
  payback_period_months: { type: Number, default: 0 },
  
  growth_score: { type: Number, default: 0 }, // 0 to 100 score
  status: {
    type: String,
    enum: ['OPPORTUNITY_IDENTIFIED', 'UNDER_FINANCIAL_REVIEW', 'APPROVED_FOR_EXPANSION', 'SHELVED'],
    default: 'OPPORTUNITY_IDENTIFIED'
  },
  admin_notes: { type: String }
}, { timestamps: true });

module.exports = {
  WarehouseTriggerConfig: mongoose.model('warehouse_trigger_configs', warehouseTriggerConfigSchema),
  WarehouseOpportunity: mongoose.model('warehouse_opportunities', warehouseOpportunitySchema)
};
