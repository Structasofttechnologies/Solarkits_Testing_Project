const mongoose = require('mongoose');
const { BenchmarkApprovalConfig } = require('../models/india_solarshop_db');
const PurchaseIndent = require('../../account-panel/models/company_warehouse_db/PurchaseIndent.schema');

const DEFAULT_COMPONENTS = [
  {
    component_type: 'panel',
    display_name: 'Solar PV Modules (550W+)',
    benchmark_cost: 6875,
    unit: 'piece',
    min_rate: 6000,
    max_rate: 8500,
    description: 'Tier-1 Mono PERC / TopCon 550W+ Solar PV Modules',
    is_active: true
  },
  {
    component_type: 'inverter',
    display_name: 'Solar On-Grid / Hybrid Inverters',
    benchmark_cost: 32000,
    unit: 'unit',
    min_rate: 25000,
    max_rate: 45000,
    description: 'High efficiency 3kW - 5kW String Inverters',
    is_active: true
  },
  {
    component_type: 'bos_kit',
    display_name: 'Complete BOS & Mounting Kit',
    benchmark_cost: 30000,
    unit: 'set',
    min_rate: 22000,
    max_rate: 40000,
    description: 'Pre-wired ACDB/DCDB, HDG Structure, DC cables & earthing kit',
    is_active: true
  },
  {
    component_type: 'battery',
    display_name: 'Lithium / Tubular Batteries',
    benchmark_cost: 25000,
    unit: 'unit',
    min_rate: 18000,
    max_rate: 35000,
    description: 'Solar energy storage battery bank',
    is_active: true
  },
  {
    component_type: 'structure',
    display_name: 'HDG Mounting Structure',
    benchmark_cost: 8500,
    unit: 'set',
    min_rate: 6500,
    max_rate: 12000,
    description: 'High wind speed resistant rooftop structure',
    is_active: true
  }
];

/**
 * 1. GET Settings (Returns current config or defaults)
 */
exports.get_settings = async (req, res) => {
  try {
    const { product_slug = 'solar-shop', country = 'india' } = req.query;

    let config = await BenchmarkApprovalConfig.findOne({
      product_slug: product_slug.toLowerCase(),
      country: country.toLowerCase()
    }).lean();

    if (!config) {
      // Seed default config in database
      const newConfig = new BenchmarkApprovalConfig({
        product_slug: product_slug.toLowerCase(),
        country: country.toLowerCase(),
        is_approval_required: true,
        tolerance_percentage: 0,
        auto_alert_percentage: 50,
        require_justification: true,
        component_benchmarks: DEFAULT_COMPONENTS,
        sku_benchmarks: [],
        updated_by_name: 'System Default'
      });
      await newConfig.save();
      config = newConfig.toObject();
    }

    return res.status(200).json({
      status: 'success',
      data: config
    });
  } catch (err) {
    console.error('Error fetching benchmark approval settings:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to load settings', error: err.message });
  }
};

/**
 * 2. UPDATE Settings
 */
exports.update_settings = async (req, res) => {
  try {
    const {
      product_slug = 'solar-shop',
      country = 'india',
      is_approval_required,
      tolerance_percentage,
      auto_alert_percentage,
      require_justification,
      component_benchmarks,
      sku_benchmarks
    } = req.body;

    const adminName = req.user?.name || req.user?.email || 'Admin';

    let config = await BenchmarkApprovalConfig.findOne({
      product_slug: product_slug.toLowerCase(),
      country: country.toLowerCase()
    });

    if (!config) {
      config = new BenchmarkApprovalConfig({
        product_slug: product_slug.toLowerCase(),
        country: country.toLowerCase()
      });
    }

    if (is_approval_required !== undefined) config.is_approval_required = Boolean(is_approval_required);
    if (tolerance_percentage !== undefined) config.tolerance_percentage = Math.max(0, Number(tolerance_percentage) || 0);
    if (auto_alert_percentage !== undefined) config.auto_alert_percentage = Math.max(0, Number(auto_alert_percentage) || 50);
    if (require_justification !== undefined) config.require_justification = Boolean(require_justification);
    if (Array.isArray(component_benchmarks)) config.component_benchmarks = component_benchmarks;
    if (Array.isArray(sku_benchmarks)) config.sku_benchmarks = sku_benchmarks;

    config.updated_by = req.user?._id || null;
    config.updated_by_name = adminName;
    config.updated_at = new Date();

    await config.save();

    return res.status(200).json({
      status: 'success',
      message: 'Benchmark Price Approval Settings updated successfully.',
      data: config
    });
  } catch (err) {
    console.error('Error updating benchmark approval settings:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to update settings', error: err.message });
  }
};

/**
 * 3. GET Pending Approvals Queue
 * Indents where is_above_benchmark: true and admin_approval is pending
 */
exports.get_pending_approvals = async (req, res) => {
  try {
    const { search = '' } = req.query;

    const query = {
      is_above_benchmark: true,
      $or: [
        { 'payment.admin_approval.status': { $in: ['pending', 'Awaiting Admin Approval'] } },
        { pi_status: 'Pending Admin Price Approval' },
        { 'payment.payment_status': 'Awaiting Admin Approval' }
      ]
    };

    if (search && search.trim()) {
      const s = search.trim();
      query.$and = [
        {
          $or: [
            { pi_number: { $regex: s, $options: 'i' } },
            { customer_order_number: { $regex: s, $options: 'i' } },
            { supplier_name: { $regex: s, $options: 'i' } },
            { supplier_brand: { $regex: s, $options: 'i' } },
            { 'items.product_name': { $regex: s, $options: 'i' } }
          ]
        }
      ];
    }

    const indents = await PurchaseIndent.find(query)
      .sort({ created_at: -1 })
      .lean();

    // Enhance each item with calculated deviation and variance metrics
    const enhanced = indents.map((indent) => {
      const items = indent.items || [];
      const primaryItem = items[0] || {};
      const unitRate = Number(primaryItem.unit_rate) || 0;
      const benchmarkCost = Number(indent.benchmark_cost) || Number(primaryItem.benchmark_cost) || 0;
      const qty = Number(primaryItem.quantity) || 1;
      const variancePerUnit = Math.max(0, unitRate - benchmarkCost);
      const totalVariance = variancePerUnit * qty;
      const variancePercentage = benchmarkCost > 0 ? ((variancePerUnit / benchmarkCost) * 100).toFixed(1) : 0;

      return {
        ...indent,
        primary_item_name: primaryItem.product_name || indent.component_type || 'Solar Component',
        quantity: qty,
        unit_rate: unitRate,
        benchmark_cost: benchmarkCost,
        variance_per_unit: variancePerUnit,
        total_variance: totalVariance,
        variance_percentage: Number(variancePercentage)
      };
    });

    return res.status(200).json({
      status: 'success',
      count: enhanced.length,
      data: enhanced
    });
  } catch (err) {
    console.error('Error fetching pending benchmark approvals:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to load pending approvals', error: err.message });
  }
};

/**
 * 4. ACTION: Approve / Return / Reject a Purchase Indent
 */
exports.action_approval = async (req, res) => {
  try {
    const { pi_id, action, remarks } = req.body;

    if (!pi_id || !action) {
      return res.status(400).json({ status: 'error', message: 'pi_id and action (approve, return, reject) are required.' });
    }

    const pi = await PurchaseIndent.findById(pi_id);
    if (!pi) {
      return res.status(404).json({ status: 'error', message: 'Purchase Indent not found.' });
    }

    const adminName = req.user?.name || req.user?.email || 'Admin';
    const normalized = action.toLowerCase();

    if (normalized === 'approve') {
      pi.pi_status = 'Approved';
      pi.requires_admin_approval = false;
      pi.payment = pi.payment || {};
      pi.payment.payment_status = 'Approved';
      pi.payment.admin_approval = {
        status: 'Approved',
        approved_by: req.user?._id || null,
        approved_at: new Date(),
        remarks: remarks || 'Benchmark rate approved by Admin'
      };

      pi.audit_history.push({
        action: 'Admin Approved Benchmark Price Exception',
        performed_by: req.user?._id || null,
        performer_name: adminName,
        role: 'Admin',
        timestamp: new Date(),
        remarks: remarks || `Rate approval granted by Admin: Exceeded benchmark by ₹${Math.max(0, (pi.items?.[0]?.unit_rate || 0) - (pi.benchmark_cost || 0))}`
      });
    } else {
      const isReturn = normalized === 'return';
      pi.pi_status = isReturn ? 'Draft' : 'Cancelled';
      pi.payment = pi.payment || {};
      pi.payment.payment_status = 'Rejected / Returned';
      pi.payment.admin_approval = {
        status: isReturn ? 'Returned' : 'Rejected',
        approved_by: req.user?._id || null,
        approved_at: new Date(),
        remarks: remarks || (isReturn ? 'Returned to Accounts for price renegotiation' : 'Rejected by Admin')
      };

      pi.audit_history.push({
        action: isReturn ? 'Admin Returned Purchase Indent (Rate Unacceptable)' : 'Admin Rejected Purchase Indent',
        performed_by: req.user?._id || null,
        performer_name: adminName,
        role: 'Admin',
        timestamp: new Date(),
        remarks: remarks || (isReturn ? 'Returned for price negotiation' : 'Rejected by Admin')
      });
    }

    await pi.save();

    return res.status(200).json({
      status: 'success',
      message: `Purchase Indent #${pi.pi_number} successfully ${normalized}d by Admin.`,
      data: pi
    });
  } catch (err) {
    console.error('Error actioning benchmark approval:', err);
    return res.status(500).json({ status: 'error', message: 'Action failed', error: err.message });
  }
};

/**
 * 5. GET Approval History & Audit Trail
 */
exports.get_approval_history = async (req, res) => {
  try {
    const historyIndents = await PurchaseIndent.find({
      is_above_benchmark: true,
      'payment.admin_approval.status': { $in: ['Approved', 'approved', 'Rejected', 'rejected', 'Returned', 'returned'] }
    })
      .sort({ updated_at: -1 })
      .limit(100)
      .lean();

    return res.status(200).json({
      status: 'success',
      count: historyIndents.length,
      data: historyIndents
    });
  } catch (err) {
    console.error('Error fetching approval history:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to load history', error: err.message });
  }
};
