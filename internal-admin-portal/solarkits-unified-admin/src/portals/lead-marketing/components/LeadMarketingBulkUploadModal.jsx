import React, { useEffect, useMemo, useState } from 'react';
import { FaCheck } from 'react-icons/fa';
import DynamicBulkUploadModal from '../../admin/components/bulk-upload/DynamicBulkUploadModal';
import {
  LEAD_MARKETING_FIELD_OPTIONS,
  LEAD_MARKETING_PRESETS,
} from '../../admin/components/bulk-upload/bulkUploadSchemas';
import { leadMarketingHttp, SEGMENT_LABELS } from '../services/leadMarketingApi';

const DEFAULT_SEGMENT_KEY = 'franchisee_leads';

export default function LeadMarketingBulkUploadModal({
  isOpen,
  onClose,
  meta: externalMeta = null,
  defaultSegmentKey = DEFAULT_SEGMENT_KEY,
  onImportSuccess,
}) {
  const [fetchedMeta, setFetchedMeta] = useState(null);

  useEffect(() => {
    if (externalMeta?.primary_segments?.length > 0) return;
    leadMarketingHttp
      .get('/meta')
      .then((res) => {
        if (res.data?.success && res.data?.data) {
          setFetchedMeta(res.data.data);
        }
      })
      .catch(() => {});
  }, [isOpen, externalMeta]);

  const activeMeta = useMemo(() => {
    if (externalMeta?.primary_segments?.length > 0) return externalMeta;
    return fetchedMeta || {
      primary_segments: [],
      subgroups: [],
      settings: { lead_sources: [], lead_statuses: [] },
      custom_fields: [],
      countries: [],
      bdes: [],
    };
  }, [externalMeta, fetchedMeta]);

  const fieldOptions = useMemo(() => {
    const existingKeys = new Set(LEAD_MARKETING_FIELD_OPTIONS.map((f) => f.key));
    const customSettingFields = (activeMeta.custom_fields || [])
      .filter((cf) => cf?.field_key && !existingKeys.has(cf.field_key))
      .map((cf) => ({
        key: cf.field_key,
        label: cf.label || cf.field_key,
        description: 'Custom Lead Marketing field (from Settings)',
        required: Boolean(cf.is_required),
        category: 'Custom Setting',
        isCustomField: true,
        aliases: [cf.field_key, cf.label].filter(Boolean),
      }));
    return [...LEAD_MARKETING_FIELD_OPTIONS, ...customSettingFields];
  }, [activeMeta.custom_fields]);

  const presets = useMemo(() => {
    const allKeys = fieldOptions.map((f) => f.key);
    return LEAD_MARKETING_PRESETS.map((p) => (p.id === 'all' ? { ...p, keys: allKeys } : p));
  }, [fieldOptions]);

  const leadSourcesOptions = useMemo(() => {
    const list = activeMeta.settings?.lead_sources || [];
    if (list.length === 0) {
      return [{ value: 'upload', label: 'Excel / CSV Upload' }];
    }
    return list
      .filter((ls) => ls.is_active !== false)
      .map((ls) => ({ value: ls.key, label: ls.label }));
  }, [activeMeta.settings?.lead_sources]);

  const validInitialSegment = useMemo(() => {
    const validKeys = ['franchisee_leads', 'epc_signup_leads', 'epc_sales_leads'];
    return validKeys.includes(defaultSegmentKey) ? defaultSegmentKey : DEFAULT_SEGMENT_KEY;
  }, [defaultSegmentKey]);

  const initialBatchDefaults = useMemo(
    () => ({
      primary_segment_key: validInitialSegment,
      subgroup_ids: [],
      default_country: 'India',
      default_lead_source: 'upload',
      default_lead_status: 'New',
      default_bde_id: '',
      default_bde_name: '',
      duplicate_rule: 'skip',
    }),
    [validInitialSegment]
  );

  const handleBulkSubmit = async (validRows, context) => {
    const defaults = context?.batchDefaults || {};
    const targetSegment = defaults.primary_segment_key || validInitialSegment;
    const subgroupIds = Array.isArray(defaults.subgroup_ids) ? defaults.subgroup_ids : [];
    const duplicateRule = defaults.duplicate_rule || 'skip';
    const defaultSource = defaults.default_lead_source || 'upload';
    const defaultCountry = defaults.default_country || 'India';
    const defaultStatus = defaults.default_lead_status || 'New';

    const columnMappingObj = {};
    (context?.headerMappings || []).forEach((m) => {
      if (!m || m.skip) return;
      columnMappingObj[m.rawHeader] = m.isCustom ? '__custom__' : m.targetKey;
    });

    const rowsPayload = validRows.map((row) => {
      const rowBde = String(row.assigned_bde || '').trim();
      const resolvedBde =
        defaults.default_bde_id && (!rowBde || rowBde === String(defaults.default_bde_name || '').trim())
          ? defaults.default_bde_id
          : rowBde || defaults.default_bde_id || '';

      return {
        company_name: row.company_name || '',
        contact_person: row.contact_person || '',
        email: row.email || '',
        country_code: row.country_code || '+91',
        mobile_number: row.mobile_number || '',
        country_name: row.country_name || defaultCountry,
        state_name: row.state_name || defaults.default_state || '',
        district_name: row.district_name || defaults.default_district || '',
        cluster_id: row.cluster_id || null,
        cluster_name: row.cluster_name || defaults.default_cluster || '',
        cluster_code: row.cluster_code || '',
        pincode: row.pincode || '',
        address_line: row.address_line || '',
        gst_number: row.gst_number || '',
        assigned_bde: resolvedBde,
        lead_source: row.lead_source || defaultSource,
        lead_status: row.lead_status || defaultStatus,
        remarks: row.remarks || defaults.default_remarks || '',
        custom_fields: row._customFields || {},
      };
    });

    const res = await leadMarketingHttp.post('/imports/execute', {
      rows: rowsPayload,
      file_name: context?.fileName || 'bulk_upload.xlsx',
      sheet_names: ['Sheet1'],
      primary_segment_key: targetSegment,
      subgroup_ids: subgroupIds,
      lead_source: defaultSource,
      duplicate_rule: duplicateRule,
      column_mapping: columnMappingObj,
      default_country: defaultCountry,
      default_state: defaults.default_state || '',
      default_district: defaults.default_district || '',
      default_cluster: defaults.default_cluster || '',
      default_bde_id: defaults.default_bde_id || '',
      default_status: defaultStatus,
      default_remarks: defaults.default_remarks || '',
      required_fields: context?.requiredFields || [],
    });

    if (res.data?.success && typeof onImportSuccess === 'function') {
      await onImportSuccess(res.data);
    }

    const hist = res.data?.data;
    const fallbackMsg = hist
      ? `Batch ${hist.batch_id}: Imported ${hist.inserted_count} new, ${hist.updated_count} updated, ${hist.duplicates_skipped} skipped.`
      : `Imported ${rowsPayload.length} lead(s).`;

    return {
      success: Boolean(res.data?.success),
      message: res.data?.message || fallbackMsg,
      skippedDetails: res.data?.skipped_details || [],
    };
  };

  return (
    <DynamicBulkUploadModal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Upload Leads (Dynamic Field Engine)"
      subtitle="Choose fields dynamically, auto-fetch & rename Excel/CSV columns to DB fields, resolve State/District/Cluster & BDE, and fix rows inline"
      badgeText="Dynamic Fields + Auto Map + Dedupe"
      fieldOptions={fieldOptions}
      presets={presets}
      defaultSelectedKeys={[
        'company_name',
        'contact_person',
        'mobile_number',
        'email',
        'state_name',
        'district_name',
        'cluster_name',
      ]}
      enableDefaultFields={{
        state: true,
        district: true,
        cluster: true,
        epcType: false,
        leadSource: true,
        remarks: true,
      }}
      allowCustomColumns={true}
      customColumnsDefaultOn={true}
      sampleFileName="central_lead_database_template.csv"
      submitLabel="Import Leads"
      initialBatchDefaults={initialBatchDefaults}
      leadSourcesOptions={leadSourcesOptions}
      onSubmitImport={handleBulkSubmit}
      renderExtraBatchDefaults={({ batchDefaults, handleBatchDefaultChange }) => {
        const selectedSegment = batchDefaults.primary_segment_key || validInitialSegment;
        const selectedSubgroups = Array.isArray(batchDefaults.subgroup_ids) ? batchDefaults.subgroup_ids : [];
        const segmentSubgroups = (activeMeta.subgroups || []).filter(
          (sg) => sg.primary_segment_key === selectedSegment
        );
        const primarySegments = activeMeta.primary_segments?.length
          ? activeMeta.primary_segments
          : Object.entries(SEGMENT_LABELS).map(([key, name]) => ({ key, name }));
        const countries = activeMeta.countries?.length
          ? activeMeta.countries
          : [{ _id: 'india', name: 'India' }];
        const leadStatuses = activeMeta.settings?.lead_statuses || [{ name: 'New' }];
        const bdes = activeMeta.bdes || [];

        return (
          <div className="rounded-xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/40 dark:bg-teal-950/20 p-3 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Primary Segment (Mandatory) *
                </label>
                <select
                  value={selectedSegment}
                  onChange={(e) =>
                    handleBatchDefaultChange({
                      primary_segment_key: e.target.value,
                      subgroup_ids: [],
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white"
                >
                  {primarySegments.map((seg) => (
                    <option key={seg.key} value={seg.key}>
                      {seg.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Default Country
                </label>
                <select
                  value={batchDefaults.default_country || 'India'}
                  onChange={(e) => handleBatchDefaultChange({ default_country: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white"
                >
                  {countries.map((c) => (
                    <option key={c._id || c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Default Assigned BDE
                </label>
                <select
                  value={batchDefaults.default_bde_id || ''}
                  onChange={(e) => {
                    const bdeId = e.target.value;
                    const matchedBde = bdes.find((b) => String(b._id) === bdeId);
                    handleBatchDefaultChange({
                      default_bde_id: bdeId,
                      default_bde_name: matchedBde?.full_name || '',
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white"
                >
                  <option value="">-- From file / Unassigned --</option>
                  {bdes.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Default Lead Status
                </label>
                <select
                  value={batchDefaults.default_lead_status || 'New'}
                  onChange={(e) => handleBatchDefaultChange({ default_lead_status: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white"
                >
                  {leadStatuses.map((st) => (
                    <option key={st.name} value={st.name}>
                      {st.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Duplicate Rule
                </label>
                <select
                  value={batchDefaults.duplicate_rule || 'skip'}
                  onChange={(e) => handleBatchDefaultChange({ duplicate_rule: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white"
                >
                  <option value="skip">Skip Duplicates (Keep Source History)</option>
                  <option value="update">Update Existing &amp; Merge Tags</option>
                </select>
              </div>
            </div>

            {segmentSubgroups.length > 0 && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  Sub-Groups to Tag ({SEGMENT_LABELS[selectedSegment] || selectedSegment})
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {segmentSubgroups.map((sg) => {
                    const checked = selectedSubgroups.includes(sg._id);
                    return (
                      <button
                        key={sg._id}
                        type="button"
                        onClick={() =>
                          handleBatchDefaultChange({
                            subgroup_ids: checked
                              ? selectedSubgroups.filter((id) => id !== sg._id)
                              : [...selectedSubgroups, sg._id],
                          })
                        }
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer transition-colors ${
                          checked
                            ? 'bg-teal-600 text-white border-teal-600'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-teal-400'
                        }`}
                      >
                        {checked && <FaCheck className="inline mr-1 text-[9px]" />}
                        {sg.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      }}
    />
  );
}
