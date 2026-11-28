const mongoose = require('mongoose');
const { USER_DB: db } = require('../../config/databases');

// 1. Primary Marketing Segments (FRD Section 2 & 17: 3 Mandatory Standardized Segments)
const primarySegmentSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      enum: ['franchisee_leads', 'epc_signup_leads', 'epc_sales_leads'],
      trim: true
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    color: { type: String, trim: true, default: '#2563EB' },
    conversion_event_label: { type: String, trim: true, default: '' },
    sort_order: { type: Number, default: 1 },
    is_locked: { type: Boolean, default: true },
    is_active: { type: Boolean, default: true }
  },
  {
    collection: 'lm_primary_segments',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

// 2. Dynamic Sub-groups under each Primary Segment (FRD Section 2 & 16.1)
const subgroupSchema = new mongoose.Schema(
  {
    primary_segment_key: {
      type: String,
      required: true,
      enum: ['franchisee_leads', 'epc_signup_leads', 'epc_sales_leads'],
      index: true
    },
    name: { type: String, required: true, trim: true, maxlength: 150 },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, trim: true, default: '' },
    color: { type: String, trim: true, default: '#4F46E5' },
    sort_order: { type: Number, default: 10 },
    is_starter: { type: Boolean, default: false },
    is_active: { type: Boolean, default: true, index: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
    deleted_at: { type: Date, default: null }
  },
  {
    collection: 'lm_subgroups',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);
subgroupSchema.index({ primary_segment_key: 1, slug: 1 }, { unique: true });

// 3. Lead-to-Subgroup Mapping (FRD Section 17: lead_segment_mapping)
const leadSegmentMappingSchema = new mongoose.Schema(
  {
    lead_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'lm_marketing_leads',
      required: true,
      index: true
    },
    primary_segment_key: {
      type: String,
      required: true,
      enum: ['franchisee_leads', 'epc_signup_leads', 'epc_sales_leads']
    },
    subgroup_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'lm_subgroups',
      required: true,
      index: true
    },
    assigned_by_name: { type: String, trim: true, default: 'Admin' },
    assigned_at: { type: Date, default: Date.now }
  },
  { collection: 'lm_segment_mappings' }
);
leadSegmentMappingSchema.index({ lead_id: 1, subgroup_id: 1 }, { unique: true });

// 4. Custom Lead Field Definitions (FRD Section 16.1 & 17: lead_custom_fields)
const leadCustomFieldSchema = new mongoose.Schema(
  {
    field_key: { type: String, required: true, unique: true, trim: true, lowercase: true },
    label: { type: String, required: true, trim: true },
    field_type: {
      type: String,
      enum: ['text', 'number', 'date', 'dropdown', 'boolean', 'url'],
      default: 'text'
    },
    options: [{ type: String, trim: true }],
    applicable_segments: [
      { type: String, enum: ['franchisee_leads', 'epc_signup_leads', 'epc_sales_leads'] }
    ],
    is_required: { type: Boolean, default: false },
    is_active: { type: Boolean, default: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null }
  },
  {
    collection: 'lm_custom_fields',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

// 5. Excel/CSV Upload & Import History (FRD Section 5 & 17: lead_import_history)
const leadImportHistorySchema = new mongoose.Schema(
  {
    batch_id: { type: String, required: true, unique: true, trim: true, index: true },
    file_name: { type: String, required: true, trim: true },
    sheet_names: [{ type: String, trim: true }],
    primary_segment_key: {
      type: String,
      enum: ['franchisee_leads', 'epc_signup_leads', 'epc_sales_leads'],
      required: true
    },
    subgroup_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'lm_subgroups' }],
    subgroup_names: [{ type: String, trim: true }],
    lead_source: { type: String, trim: true, default: 'upload' },
    duplicate_rule: { type: String, enum: ['skip', 'update'], default: 'skip' },
    column_mapping: { type: mongoose.Schema.Types.Mixed, default: {} },
    total_rows: { type: Number, default: 0 },
    inserted_count: { type: Number, default: 0 },
    updated_count: { type: Number, default: 0 },
    duplicates_skipped: { type: Number, default: 0 },
    invalid_count: { type: Number, default: 0 },
    errors_sample: { type: [mongoose.Schema.Types.Mixed], default: [] },
    uploaded_by_id: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
    uploaded_by_name: { type: String, trim: true, default: 'Admin' },
    imported_at: { type: Date, default: Date.now, index: true }
  },
  { collection: 'lm_import_histories' }
);

// 6. Reusable Excel Column Mapping Templates (FRD Section 5.2 & 17: lead_import_mapping)
const leadImportMappingSchema = new mongoose.Schema(
  {
    template_name: { type: String, required: true, trim: true },
    primary_segment_key: {
      type: String,
      enum: ['franchisee_leads', 'epc_signup_leads', 'epc_sales_leads', 'all'],
      default: 'all'
    },
    column_mapping: { type: mongoose.Schema.Types.Mixed, required: true },
    custom_field_keys: [{ type: String, trim: true }],
    duplicate_rule: { type: String, enum: ['skip', 'update'], default: 'skip' },
    created_by_name: { type: String, trim: true, default: 'Admin' }
  },
  {
    collection: 'lm_import_mappings',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

// 7. Follow-up & Activity History (FRD Section 11 & 17: lead_activities)
const leadActivitySchema = new mongoose.Schema(
  {
    lead_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'lm_marketing_leads',
      required: true,
      index: true
    },
    lead_code: { type: String, trim: true, default: '' },
    activity_type: {
      type: String,
      enum: [
        'call',
        'meeting',
        'email_sent',
        'email_open',
        'email_click',
        'proposal_shared',
        'quotation_shared',
        'status_change',
        'bde_assigned',
        'segment_change',
        'merge',
        'import',
        'note',
        'conversion_sync'
      ],
      default: 'note',
      index: true
    },
    bde_id: { type: mongoose.Schema.Types.ObjectId, ref: 'bde_profiles', default: null, index: true },
    bde_name: { type: String, trim: true, default: null },
    old_value: { type: String, trim: true, default: null },
    new_value: { type: String, trim: true, default: null },
    notes: { type: String, trim: true, default: '' },
    outcome: { type: String, trim: true, default: '' },
    next_followup_at: { type: Date, default: null },
    campaign_id: { type: mongoose.Schema.Types.ObjectId, ref: 'lm_campaigns', default: null },
    actor_name: { type: String, trim: true, default: 'Admin' },
    occurred_at: { type: Date, default: Date.now, index: true }
  },
  { collection: 'lm_lead_activities' }
);

// 8. Lead BDE Ownership History (FRD Section 17: marketing_bde_mapping)
const leadBdeMappingSchema = new mongoose.Schema(
  {
    lead_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'lm_marketing_leads',
      required: true,
      index: true
    },
    bde_id: { type: mongoose.Schema.Types.ObjectId, ref: 'bde_profiles', required: true, index: true },
    bde_name: { type: String, trim: true, default: '' },
    assigned_by_name: { type: String, trim: true, default: 'Admin' },
    is_current: { type: Boolean, default: true, index: true },
    assigned_at: { type: Date, default: Date.now },
    unassigned_at: { type: Date, default: null }
  },
  { collection: 'lm_bde_mappings' }
);

// 9. Marketing System Settings & RBAC Matrix (FRD Sections 14 & 16)
const leadMarketingSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'global' },
    lead_statuses: [
      {
        name: { type: String, required: true, trim: true },
        color: { type: String, default: '#64748B' },
        category: { type: String, enum: ['open', 'engaged', 'converted', 'closed'], default: 'open' },
        is_system: { type: Boolean, default: true },
        sort_order: { type: Number, default: 1 }
      }
    ],
    lead_sources: [
      {
        key: { type: String, required: true, trim: true },
        label: { type: String, required: true, trim: true },
        is_active: { type: Boolean, default: true }
      }
    ],
    campaign_categories: [
      {
        primary_segment_key: { type: String, default: 'all' },
        name: { type: String, required: true, trim: true },
        description: { type: String, default: '' }
      }
    ],
    attribution_config: {
      default_model: { type: String, enum: ['first_touch', 'last_touch'], default: 'last_touch' },
      attribution_window_days: { type: Number, default: 30, min: 1, max: 365 },
      treat_opens_clicks_as_engagement_signals_only: { type: Boolean, default: true },
      exclude_suspected_bots_from_human_rate: { type: Boolean, default: false }
    },
    email_sending_controls: {
      daily_limit: { type: Number, default: 10000 },
      rate_per_minute: { type: Number, default: 60 },
      retry_attempts: { type: Number, default: 2 },
      enforce_suppression_check: { type: Boolean, default: true }
    },
    data_retention_policy: {
      audit_log_retention_days: { type: Number, default: 365 },
      import_history_retention_days: { type: Number, default: 730 },
      inactive_lead_threshold_days: { type: Number, default: 90 }
    },
    rbac_permissions: [
      {
        role_key: { type: String, required: true },
        role_label: { type: String, required: true },
        permissions: {
          view_overview: { type: Boolean, default: true },
          manage_leads: { type: Boolean, default: false },
          import_leads: { type: Boolean, default: false },
          export_reports: { type: Boolean, default: false },
          manage_subgroups: { type: Boolean, default: false },
          create_campaigns: { type: Boolean, default: false },
          launch_campaigns: { type: Boolean, default: false },
          view_analytics: { type: Boolean, default: true },
          manage_bde_followup: { type: Boolean, default: false },
          view_commercial_orders: { type: Boolean, default: false },
          view_franchisee_pipeline: { type: Boolean, default: false },
          manage_settings: { type: Boolean, default: false }
        }
      }
    ]
  },
  {
    collection: 'lm_settings',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

// 10. System Activity & Security Audit Logs (FRD Section 16.3 & 17: marketing_audit_logs)
const leadAuditLogSchema = new mongoose.Schema(
  {
    actor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
    actor_name: { type: String, trim: true, default: 'Admin' },
    action: { type: String, required: true, trim: true, index: true },
    entity_type: { type: String, required: true, trim: true, index: true },
    entity_id: { type: String, trim: true, default: null },
    summary: { type: String, trim: true, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip_address: { type: String, trim: true, default: null },
    created_at: { type: Date, default: Date.now, index: true }
  },
  { collection: 'lm_audit_logs' }
);

module.exports = {
  LeadPrimarySegment: db.model('lm_primary_segments', primarySegmentSchema),
  LeadSubgroup: db.model('lm_subgroups', subgroupSchema),
  LeadSegmentMapping: db.model('lm_segment_mappings', leadSegmentMappingSchema),
  LeadCustomField: db.model('lm_custom_fields', leadCustomFieldSchema),
  LeadImportHistory: db.model('lm_import_histories', leadImportHistorySchema),
  LeadImportMapping: db.model('lm_import_mappings', leadImportMappingSchema),
  LeadActivity: db.model('lm_lead_activities', leadActivitySchema),
  LeadBdeMapping: db.model('lm_bde_mappings', leadBdeMappingSchema),
  LeadMarketingSettings: db.model('lm_settings', leadMarketingSettingsSchema),
  LeadAuditLog: db.model('lm_audit_logs', leadAuditLogSchema)
};
