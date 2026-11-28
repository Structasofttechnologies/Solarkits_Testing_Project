const {
  LeadPrimarySegment,
  LeadSubgroup,
  LeadMarketingSettings
} = require('../models');

const STARTER_PRIMARY_SEGMENTS = [
  {
    key: 'franchisee_leads',
    name: 'Franchisee Leads',
    description: 'Prospects & applicants interested in owning a district Solarkits Franchisee Store.',
    color: '#7C3AED',
    conversion_event_label: 'Franchise Converted & Activated',
    sort_order: 1,
    is_locked: true
  },
  {
    key: 'epc_signup_leads',
    name: 'EPC Signup Leads',
    description: 'Solar EPC contractors targeted for portal registration & GST/KYC verification.',
    color: '#2563EB',
    conversion_event_label: 'Verified EPC Registered',
    sort_order: 2,
    is_locked: true
  },
  {
    key: 'epc_sales_leads',
    name: 'EPC Sales Leads',
    description: 'Registered or active EPC buyers targeted for Trial Kits, Loose Orders, Bulk POs & Tenders.',
    color: '#059669',
    conversion_event_label: 'Confirmed Commercial Order',
    sort_order: 3,
    is_locked: true
  }
];

const STARTER_SUBGROUPS = {
  franchisee_leads: [
    'New Franchise Leads',
    'Interested Franchise Leads',
    'District Available Leads',
    'Franchise Meeting Leads',
    'Proposal Shared',
    'Payment Pending',
    'Franchise Converted',
    'Existing Franchisee'
  ],
  epc_signup_leads: [
    'New EPC Leads',
    'Interested EPC Leads',
    'Registration Pending',
    'GST/KYC Verification Pending',
    'Registered EPC',
    'Trial Kit Pending',
    'Inactive EPC',
    'Reactivation Leads'
  ],
  epc_sales_leads: [
    'Trial Kit Leads',
    'Trial Kit Ordered',
    'Loose Quantity Leads',
    'Bulk PO Leads',
    'Government Tender EPC',
    'DCR Module Leads',
    'Residential Kit Leads',
    'Commercial Kit Leads',
    'Repeat Buyers',
    'High Volume EPC'
  ]
};

const STARTER_STATUSES = [
  { name: 'New', color: '#3B82F6', category: 'open', is_system: true, sort_order: 1 },
  { name: 'Not Contacted', color: '#64748B', category: 'open', is_system: true, sort_order: 2 },
  { name: 'Contacted', color: '#06B6D4', category: 'engaged', is_system: true, sort_order: 3 },
  { name: 'Interested', color: '#8B5CF6', category: 'engaged', is_system: true, sort_order: 4 },
  { name: 'Follow-up Required', color: '#F59E0B', category: 'engaged', is_system: true, sort_order: 5 },
  { name: 'Meeting Scheduled', color: '#6366F1', category: 'engaged', is_system: true, sort_order: 6 },
  { name: 'Proposal Shared', color: '#EC4899', category: 'engaged', is_system: true, sort_order: 7 },
  { name: 'Quotation Shared', color: '#14B8A6', category: 'engaged', is_system: true, sort_order: 8 },
  { name: 'Converted', color: '#10B981', category: 'converted', is_system: true, sort_order: 9 },
  { name: 'Not Interested', color: '#94A3B8', category: 'closed', is_system: true, sort_order: 10 },
  { name: 'Lost', color: '#EF4444', category: 'closed', is_system: true, sort_order: 11 },
  { name: 'Invalid', color: '#DC2626', category: 'closed', is_system: true, sort_order: 12 },
  { name: 'Unsubscribed', color: '#B91C1C', category: 'closed', is_system: true, sort_order: 13 }
];

const STARTER_SOURCES = [
  { key: 'upload', label: 'Excel / CSV Upload', is_active: true },
  { key: 'website', label: 'Website Form / Portal', is_active: true },
  { key: 'exhibition', label: 'Exhibition / Expo', is_active: true },
  { key: 'referral', label: 'Partner Referral', is_active: true },
  { key: 'bde_field', label: 'BDE Field Visit', is_active: true },
  { key: 'digital_ads', label: 'Digital Ads Campaign', is_active: true },
  { key: 'manual', label: 'Manual CRM Entry', is_active: true }
];

const STARTER_CATEGORIES = [
  { primary_segment_key: 'franchisee_leads', name: 'District Franchise Opportunity', description: 'Territories & availability launch outreach' },
  { primary_segment_key: 'franchisee_leads', name: 'Franchise Investment Proposal', description: 'Agreement, commercial ROI & meeting reminders' },
  { primary_segment_key: 'epc_signup_leads', name: 'EPC Onboarding & Registration', description: 'Portal registration & GST/KYC verification pushes' },
  { primary_segment_key: 'epc_signup_leads', name: 'Inactive EPC Reactivation', description: 'Re-engagement & platform benefit showcases' },
  { primary_segment_key: 'epc_sales_leads', name: 'Trial Kit Promotion', description: 'Sample trial combo kit ordering campaigns' },
  { primary_segment_key: 'epc_sales_leads', name: 'DCR & Loose / Bulk PO Supply', description: 'Ready depot allocation, tender & bulk volume offers' }
];

const STARTER_RBAC = [
  {
    role_key: 'super_admin',
    role_label: 'Super Admin',
    permissions: {
      view_overview: true, manage_leads: true, import_leads: true, export_reports: true,
      manage_subgroups: true, create_campaigns: true, launch_campaigns: true,
      view_analytics: true, manage_bde_followup: true, view_commercial_orders: true,
      view_franchisee_pipeline: true, manage_settings: true
    }
  },
  {
    role_key: 'marketing_admin',
    role_label: 'Marketing Admin',
    permissions: {
      view_overview: true, manage_leads: true, import_leads: true, export_reports: true,
      manage_subgroups: true, create_campaigns: true, launch_campaigns: true,
      view_analytics: true, manage_bde_followup: true, view_commercial_orders: true,
      view_franchisee_pipeline: true, manage_settings: false
    }
  },
  {
    role_key: 'marketing_executive',
    role_label: 'Marketing Executive',
    permissions: {
      view_overview: true, manage_leads: true, import_leads: true, export_reports: true,
      manage_subgroups: false, create_campaigns: true, launch_campaigns: false,
      view_analytics: true, manage_bde_followup: false, view_commercial_orders: false,
      view_franchisee_pipeline: false, manage_settings: false
    }
  },
  {
    role_key: 'bde',
    role_label: 'BDE',
    permissions: {
      view_overview: true, manage_leads: true, import_leads: false, export_reports: false,
      manage_subgroups: false, create_campaigns: false, launch_campaigns: false,
      view_analytics: false, manage_bde_followup: true, view_commercial_orders: true,
      view_franchisee_pipeline: true, manage_settings: false
    }
  },
  {
    role_key: 'sales_manager',
    role_label: 'Sales Manager',
    permissions: {
      view_overview: true, manage_leads: false, import_leads: false, export_reports: true,
      manage_subgroups: false, create_campaigns: false, launch_campaigns: false,
      view_analytics: true, manage_bde_followup: true, view_commercial_orders: true,
      view_franchisee_pipeline: false, manage_settings: false
    }
  },
  {
    role_key: 'franchisee_manager',
    role_label: 'Franchisee Manager',
    permissions: {
      view_overview: true, manage_leads: false, import_leads: false, export_reports: true,
      manage_subgroups: false, create_campaigns: false, launch_campaigns: false,
      view_analytics: true, manage_bde_followup: true, view_commercial_orders: false,
      view_franchisee_pipeline: true, manage_settings: false
    }
  }
];

const slugify = (s) =>
  String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

let bootstrapped = false;
let bootstrapPromise = null;

const ensureLeadMarketingSeeded = async () => {
  if (bootstrapped) return;
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    try {
      for (const seg of STARTER_PRIMARY_SEGMENTS) {
        await LeadPrimarySegment.updateOne(
          { key: seg.key },
          { $setOnInsert: seg },
          { upsert: true }
        );
      }

      const segmentColorMap = {
        franchisee_leads: '#7C3AED',
        epc_signup_leads: '#2563EB',
        epc_sales_leads: '#059669'
      };

      for (const [segKey, names] of Object.entries(STARTER_SUBGROUPS)) {
        for (let i = 0; i < names.length; i++) {
          const name = names[i];
          const slug = slugify(name);
          await LeadSubgroup.updateOne(
            { primary_segment_key: segKey, slug },
            {
              $setOnInsert: {
                primary_segment_key: segKey,
                name,
                slug,
                color: segmentColorMap[segKey] || '#4F46E5',
                sort_order: i + 1,
                is_starter: true,
                is_active: true
              }
            },
            { upsert: true }
          );
        }
      }

      await LeadMarketingSettings.updateOne(
        { key: 'global' },
        {
          $setOnInsert: {
            key: 'global',
            lead_statuses: STARTER_STATUSES,
            lead_sources: STARTER_SOURCES,
            campaign_categories: STARTER_CATEGORIES,
            attribution_config: {
              default_model: 'last_touch',
              attribution_window_days: 30,
              treat_opens_clicks_as_engagement_signals_only: true,
              exclude_suspected_bots_from_human_rate: false
            },
            email_sending_controls: {
              daily_limit: 10000,
              rate_per_minute: 60,
              retry_attempts: 2,
              enforce_suppression_check: true
            },
            data_retention_policy: {
              audit_log_retention_days: 365,
              import_history_retention_days: 730,
              inactive_lead_threshold_days: 90
            },
            rbac_permissions: STARTER_RBAC
          }
        },
        { upsert: true }
      );

      bootstrapped = true;
    } catch (err) {
      console.warn('⚠️ [LeadMarketing Seed] Notice:', err.message);
    } finally {
      bootstrapPromise = null;
    }
  })();

  return bootstrapPromise;
};

module.exports = {
  ensureLeadMarketingSeeded,
  STARTER_PRIMARY_SEGMENTS,
  STARTER_SUBGROUPS,
  STARTER_STATUSES
};
