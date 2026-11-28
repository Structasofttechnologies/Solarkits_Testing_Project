import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Check,
  Sparkles,
  ChevronDown,
  ChevronUp,
  UploadCloud,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Loader2,
  Plus,
  RotateCcw,
  MapPin,
} from 'lucide-react';
import api from '../../services/api';
import {
  parseSpreadsheetFile,
  autoMapSpreadsheetHeaders,
  buildValidatedPreviewRows,
  revalidateSingleRow,
  downloadDynamicSampleTemplate,
  slugifyHeaderKey,
  buildClientClusterResolver,
} from './parseSpreadsheetFile';
import {
  BDE_EPC_LEADS_FIELD_OPTIONS,
  BDE_BULK_PRESETS,
  BDE_SAMPLE_ROWS,
} from './bdeBulkUploadSchema';

const LEAD_SOURCE_OPTIONS = [
  { value: 'direct_visit', label: 'Direct Visit' },
  { value: 'phone_call', label: 'Phone Call' },
  { value: 'referral', label: 'Referral' },
  { value: 'trade_show', label: 'Trade Show / Expo' },
  { value: 'digital', label: 'Digital / Website' },
  { value: 'cold_outreach', label: 'Cold Outreach' },
  { value: 'portal', label: 'Portal' },
];

export default function DynamicBulkUploadModal({
  isOpen,
  onClose,
  territories = [],
  epcTypes = [],
  onSuccess,
}) {
  const [managedFieldOptions, setManagedFieldOptions] = useState(BDE_EPC_LEADS_FIELD_OPTIONS);
  const [activeFieldKeys, setActiveFieldKeys] = useState(() =>
    BDE_EPC_LEADS_FIELD_OPTIONS.filter((f) =>
      ['company_name', 'mobile_number', 'gst_number', 'email', 'contact_person', 'district_name', 'state_name'].includes(f.key)
    ).map((f) => f.key)
  );
  const [newFieldLabel, setNewFieldLabel] = useState('');

  const [showDefaults, setShowDefaults] = useState(true);
  const [batchDefaults, setBatchDefaults] = useState({
    default_state: '',
    default_district: '',
    default_cluster: '',
    default_lead_source: 'direct_visit',
    default_epc_type: '', // '' = Auto-Detect (Buyer / Verified / Registered)
    default_follow_up_date: '',
    default_remarks: '',
  });

  const [allClusters, setAllClusters] = useState([]);
  const [rawRecords, setRawRecords] = useState([]);
  const [rawHeaders, setRawHeaders] = useState([]);
  const [fileName, setFileName] = useState('');
  const [headerMappings, setHeaderMappings] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'valid' | 'errors'
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [errorBanner, setErrorBanner] = useState('');

  const clusterResolver = useMemo(() => buildClientClusterResolver(allClusters), [allClusters]);

  useEffect(() => {
    if (!isOpen) return;
    setImportResult(null);
    setErrorBanner('');
    setRawRecords([]);
    setRawHeaders([]);
    setFileName('');
    setHeaderMappings([]);
    setPreviewRows([]);
    setFilterTab('all');

    const defaultState = territories[0]?.state_name || '';
    const defaultDistrict = territories[0]?.district_names?.[0] || '';
    setBatchDefaults((prev) => ({
      ...prev,
      default_state: prev.default_state || defaultState,
      default_district: prev.default_district || defaultDistrict,
    }));

    api
      .get('/epc-leads/clusters')
      .then((res) => {
        if (Array.isArray(res.data?.data)) {
          setAllClusters(res.data.data);
        }
      })
      .catch(() => {});
  }, [isOpen, territories]);

  const recomputeRows = (records, mappings, activeKeys, defaults, fieldsList = managedFieldOptions) => {
    if (!records || records.length === 0) {
      setPreviewRows([]);
      return;
    }
    const { rows } = buildValidatedPreviewRows({
      records,
      headerMappings: mappings,
      fieldOptions: fieldsList,
      activeFieldKeys: activeKeys,
      batchDefaults: defaults,
      allowCustomColumns: true,
      clusterResolver,
    });
    setPreviewRows(rows);
  };

  useEffect(() => {
    if (isOpen && rawRecords.length > 0 && headerMappings.length > 0) {
      recomputeRows(rawRecords, headerMappings, activeFieldKeys, batchDefaults, managedFieldOptions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allClusters]);

  if (!isOpen) return null;

  const availableStates = territories.length > 0
    ? territories.map((t) => t.state_name).filter(Boolean)
    : Array.from(new Set(allClusters.map((c) => c.state_name).filter(Boolean))).sort();

  const selectedTerritory = territories.find(
    (t) => t.state_name?.toLowerCase() === batchDefaults.default_state?.toLowerCase()
  );
  const availableDistricts = selectedTerritory?.district_names?.length
    ? selectedTerritory.district_names
    : Array.from(
        new Set(
          allClusters
            .filter((c) => !batchDefaults.default_state || c.state_name?.toLowerCase() === batchDefaults.default_state.toLowerCase())
            .flatMap((c) => c.district_names || [])
        )
      ).sort();

  const filteredClusters = allClusters.filter(
    (c) => !batchDefaults.default_state || c.state_name?.toLowerCase() === batchDefaults.default_state.toLowerCase()
  );

  const handleToggleField = (key) => {
    const field = managedFieldOptions.find((f) => f.key === key);
    if (field?.required) return;
    const nextKeys = activeFieldKeys.includes(key)
      ? activeFieldKeys.filter((k) => k !== key)
      : [...activeFieldKeys, key];
    setActiveFieldKeys(nextKeys);
    if (rawRecords.length > 0) {
      const nextMappings = autoMapSpreadsheetHeaders(rawHeaders, managedFieldOptions, nextKeys);
      setHeaderMappings(nextMappings);
      recomputeRows(rawRecords, nextMappings, nextKeys, batchDefaults, managedFieldOptions);
    }
  };

  const handleToggleRequired = (key) => {
    const nextFields = managedFieldOptions.map((f) =>
      f.key === key ? { ...f, required: !f.required } : f
    );
    const toggledField = nextFields.find((f) => f.key === key);
    const nextKeys =
      toggledField?.required && !activeFieldKeys.includes(key)
        ? [...activeFieldKeys, key]
        : activeFieldKeys;
    setManagedFieldOptions(nextFields);
    setActiveFieldKeys(nextKeys);
    if (rawRecords.length > 0) {
      recomputeRows(rawRecords, headerMappings, nextKeys, batchDefaults, nextFields);
    }
  };

  const handleAddCustomField = () => {
    const label = newFieldLabel.trim();
    if (!label) return;
    let key = slugifyHeaderKey(label, managedFieldOptions.length);
    if (managedFieldOptions.some((f) => f.key === key)) {
      key = `${key}_${managedFieldOptions.length + 1}`;
    }
    const newField = {
      key,
      label,
      desc: 'Custom field (editable & DB synced)',
      required: false,
      isCustomAdded: true,
      tag: 'Custom',
      tagColor: 'bg-violet-100 text-violet-800 border-violet-200',
      aliases: [label.toLowerCase().replace(/[^a-z0-9]/g, ''), key.replace(/_/g, '')],
    };
    const nextFields = [...managedFieldOptions, newField];
    const nextKeys = [...activeFieldKeys, key];
    setManagedFieldOptions(nextFields);
    setActiveFieldKeys(nextKeys);
    setNewFieldLabel('');
    if (rawRecords.length > 0) {
      const nextMappings = autoMapSpreadsheetHeaders(rawHeaders, nextFields, nextKeys);
      setHeaderMappings(nextMappings);
      recomputeRows(rawRecords, nextMappings, nextKeys, batchDefaults, nextFields);
    }
  };

  const handleDeleteField = (key) => {
    const target = managedFieldOptions.find((f) => f.key === key);
    if (target?.required) return;
    const nextFields = managedFieldOptions.filter((f) => f.key !== key);
    const nextKeys = activeFieldKeys.filter((k) => k !== key);
    setManagedFieldOptions(nextFields);
    setActiveFieldKeys(nextKeys);
    if (rawRecords.length > 0) {
      const nextMappings = autoMapSpreadsheetHeaders(rawHeaders, nextFields, nextKeys);
      setHeaderMappings(nextMappings);
      recomputeRows(rawRecords, nextMappings, nextKeys, batchDefaults, nextFields);
    }
  };

  const handleResetDefaultFields = () => {
    const baseFields = BDE_EPC_LEADS_FIELD_OPTIONS.map((f) => ({ ...f }));
    const baseKeys = baseFields
      .filter((f) =>
        ['company_name', 'mobile_number', 'gst_number', 'email', 'contact_person', 'district_name', 'state_name'].includes(f.key)
      )
      .map((f) => f.key);
    setManagedFieldOptions(baseFields);
    setActiveFieldKeys(baseKeys);
    if (rawRecords.length > 0) {
      const nextMappings = autoMapSpreadsheetHeaders(rawHeaders, baseFields, baseKeys);
      setHeaderMappings(nextMappings);
      recomputeRows(rawRecords, nextMappings, baseKeys, batchDefaults, baseFields);
    }
  };

  const applyPreset = (preset) => {
    const requiredKeys = managedFieldOptions.filter((f) => f.required).map((f) => f.key);
    const nextKeys = Array.from(new Set([...requiredKeys, ...preset.fields])).filter((k) =>
      managedFieldOptions.some((f) => f.key === k)
    );
    setActiveFieldKeys(nextKeys);
    if (rawRecords.length > 0) {
      const nextMappings = autoMapSpreadsheetHeaders(rawHeaders, managedFieldOptions, nextKeys);
      setHeaderMappings(nextMappings);
      recomputeRows(rawRecords, nextMappings, nextKeys, batchDefaults, managedFieldOptions);
    }
  };

  const handleDefaultChange = (patch) => {
    const nextDefaults = { ...batchDefaults, ...patch };
    setBatchDefaults(nextDefaults);
    if (rawRecords.length > 0) {
      recomputeRows(rawRecords, headerMappings, activeFieldKeys, nextDefaults, managedFieldOptions);
    }
  };

  const handleFile = async (file) => {
    if (!file) return;
    setErrorBanner('');
    setParsing(true);
    try {
      const parsed = await parseSpreadsheetFile(file);
      if (!parsed.records || parsed.records.length === 0) {
        setErrorBanner('File parsed, but 0 data rows were found.');
        setParsing(false);
        return;
      }
      const autoMappings = autoMapSpreadsheetHeaders(parsed.headers, managedFieldOptions, activeFieldKeys);
      const newlyMatchedKeys = autoMappings
        .filter((m) => !m.isCustom && !m.skip && m.targetKey)
        .map((m) => m.targetKey);
      const nextActiveKeys = Array.from(new Set([...activeFieldKeys, ...newlyMatchedKeys]));

      setFileName(parsed.fileName);
      setRawHeaders(parsed.headers);
      setRawRecords(parsed.records);
      setActiveFieldKeys(nextActiveKeys);
      setHeaderMappings(autoMappings);
      recomputeRows(parsed.records, autoMappings, nextActiveKeys, batchDefaults, managedFieldOptions);
    } catch (err) {
      setErrorBanner(err.message || 'Failed to parse file');
    } finally {
      setParsing(false);
    }
  };

  const handleMappingChange = (rawHeader, newTarget) => {
    const nextMappings = headerMappings.map((m) => {
      if (m.rawHeader !== rawHeader) return m;
      if (newTarget === '__skip__') {
        return { ...m, skip: true, isCustom: false, targetKey: '', matchType: 'skipped' };
      }
      if (newTarget.startsWith('__custom__:')) {
        const ck = slugifyHeaderKey(rawHeader);
        return { ...m, skip: false, isCustom: true, targetKey: ck, targetLabel: rawHeader, matchType: 'custom' };
      }
      const fieldMeta = managedFieldOptions.find((f) => f.key === newTarget);
      return {
        ...m,
        skip: false,
        isCustom: false,
        targetKey: newTarget,
        targetLabel: fieldMeta?.label || newTarget,
        matchType: 'manual',
      };
    });

    const newlyActivated = [...activeFieldKeys];
    if (newTarget && !newTarget.startsWith('__') && !newlyActivated.includes(newTarget)) {
      newlyActivated.push(newTarget);
      setActiveFieldKeys(newlyActivated);
    }
    setHeaderMappings(nextMappings);
    recomputeRows(rawRecords, nextMappings, newlyActivated, batchDefaults, managedFieldOptions);
  };

  const handleCellEdit = (rowIndex, fieldKey, newVal) => {
    setPreviewRows((prev) =>
      prev.map((row) => {
        if (row._rowIndex !== rowIndex) return row;
        const updated = { ...row, [fieldKey]: newVal };
        return revalidateSingleRow(updated, managedFieldOptions, activeFieldKeys, batchDefaults, clusterResolver);
      })
    );
  };

  const handleDeleteRow = (rowIndex) => {
    setPreviewRows((prev) => prev.filter((r) => r._rowIndex !== rowIndex));
  };

  const validRows = previewRows.filter((r) => r._isValid);
  const errorRows = previewRows.filter((r) => !r._isValid);
  const displayedRows =
    filterTab === 'valid' ? validRows : filterTab === 'errors' ? errorRows : previewRows;

  const visibleColumns = managedFieldOptions.filter(
    (f) => f.required || activeFieldKeys.includes(f.key)
  );

  const handleSubmitImport = async () => {
    if (validRows.length === 0) return;
    setSubmitting(true);
    setErrorBanner('');
    try {
      const standardFieldKeys = new Set(BDE_EPC_LEADS_FIELD_OPTIONS.map((f) => f.key));
      const payloadRows = validRows.map((r) => {
        const clean = {};
        for (const f of managedFieldOptions) {
          if (f.required || activeFieldKeys.includes(f.key) || r[f.key]) {
            if (standardFieldKeys.has(f.key)) {
              clean[f.key] = r[f.key] ?? '';
            } else if (r[f.key]) {
              clean.custom_attributes = { ...(clean.custom_attributes || {}), [f.key]: r[f.key] };
            }
          }
        }
        if (r._resolvedCluster) {
          if (r._resolvedCluster.cluster_id && !clean.cluster_id) clean.cluster_id = r._resolvedCluster.cluster_id;
          if (r._resolvedCluster.cluster_name && !clean.cluster_name) clean.cluster_name = r._resolvedCluster.cluster_name;
          if (r._resolvedCluster.cluster_code && !clean.cluster_code) clean.cluster_code = r._resolvedCluster.cluster_code;
          if (r._resolvedCluster.state_name && !clean.state_name) clean.state_name = r._resolvedCluster.state_name;
        }
        if (r._customFields && Object.keys(r._customFields).length > 0) {
          clean.custom_attributes = { ...(clean.custom_attributes || {}), ...r._customFields };
        }
        return clean;
      });

      const requiredFields = managedFieldOptions.filter((f) => f.required).map((f) => f.key);

      const res = await api.post('/epc-leads/bulk-create', {
        leads: payloadRows,
        default_settings: {
          state_name: batchDefaults.default_state,
          district_name: batchDefaults.default_district,
          cluster_name: batchDefaults.default_cluster,
          lead_source: batchDefaults.default_lead_source,
          epc_type: batchDefaults.default_epc_type || 'auto',
          follow_up_date: batchDefaults.default_follow_up_date || null,
          remarks: batchDefaults.default_remarks || '',
          required_fields: requiredFields,
        },
      });

      if (res.data?.status === 'success') {
        setImportResult(res.data.data);
        if (typeof onSuccess === 'function') onSuccess();
      } else {
        setErrorBanner(res.data?.message || 'Bulk upload failed');
      }
    } catch (err) {
      setErrorBanner(err.response?.data?.message || err.message || 'Bulk upload failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6">
      <div className="bg-white w-full max-w-6xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight">Bulk Upload EPC Leads</h2>
                <span className="text-[10px] font-bold bg-emerald-400/20 text-emerald-100 border border-emerald-300/30 px-2 py-0.5 rounded-full">
                  Dynamic Fields + Auto Cluster & Category
                </span>
              </div>
              <p className="text-xs text-indigo-100 mt-0.5">
                Auto-renames CSV/Excel columns to DB fields, resolves Franchisee Cluster & classifies Buyer / Verified / Registered EPCs
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        {importResult ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-black text-emerald-950">Bulk Import Complete</h3>
                <p className="text-emerald-800 mt-1">
                  Created <strong>{importResult.created_count}</strong> leads out of{' '}
                  <strong>{importResult.total_submitted}</strong> submitted rows.
                  {importResult.skipped_count > 0 && (
                    <span className="ml-1 text-amber-800">
                      ({importResult.skipped_count} skipped due to duplicates/validation)
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Cluster & State Breakdown */}
            {(Object.keys(importResult.cluster_summary || {}).length > 0 ||
              Object.keys(importResult.state_summary || {}).length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.keys(importResult.cluster_summary || {}).length > 0 && (
                  <div className="border border-indigo-200 bg-indigo-50/40 rounded-xl p-4">
                    <h4 className="font-black text-indigo-950 mb-2 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                      Assigned to Clusters
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(importResult.cluster_summary).map(([clu, cnt]) => (
                        <span
                          key={clu}
                          className="px-2.5 py-1 rounded-full bg-white border border-indigo-200 text-indigo-800 font-bold text-[11px]"
                        >
                          {clu}: {cnt}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {Object.keys(importResult.state_summary || {}).length > 0 && (
                  <div className="border border-slate-200 bg-slate-50 rounded-xl p-4">
                    <h4 className="font-black text-slate-900 mb-2">State-wise Distribution</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(importResult.state_summary).map(([st, cnt]) => (
                        <span
                          key={st}
                          className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 font-bold text-[11px]"
                        >
                          {st}: {cnt}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Skipped Details */}
            {Array.isArray(importResult.skipped_leads) && importResult.skipped_leads.length > 0 && (
              <div className="border border-amber-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 font-black text-amber-900">
                  Skipped / Duplicate Rows ({importResult.skipped_leads.length})
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {importResult.skipped_leads.map((s, idx) => (
                    <div key={idx} className="px-4 py-2 flex items-center justify-between gap-4 bg-white">
                      <div>
                        <span className="font-bold text-slate-800">Row #{s.row}: {s.company_name}</span>
                        {s.mobile_number && <span className="ml-2 text-slate-500">{s.mobile_number}</span>}
                      </div>
                      <span className="text-amber-700 font-semibold">{s.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition"
              >
                Done & View Leads
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
            {errorBanner && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorBanner}</span>
              </div>
            )}

            {/* STEP 1: Dynamic Field Selector */}
            <div className="border border-indigo-200 bg-indigo-50/40 rounded-2xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-indigo-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black shadow-xs">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-slate-900 text-xs">
                        Step 1: Choose Fields to Extract from CSV / Excel
                      </span>
                      <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full border border-indigo-200">
                        {activeFieldKeys.length} Active • {managedFieldOptions.filter((f) => f.required).length} Required
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Click the Required/Optional pill on any card to customize mandatory fields. Add custom fields or delete unused ones.
                    </p>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center flex-wrap gap-1">
                  <span className="text-[10px] font-bold text-slate-400 mr-1 uppercase">Presets:</span>
                  {BDE_BULK_PRESETS.map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition shadow-xs ${
                        preset.primary
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          : 'bg-white hover:bg-indigo-100 hover:text-indigo-800 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Checkbox Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 pt-3">
                {managedFieldOptions.map((field) => {
                  const isChecked = field.required || activeFieldKeys.includes(field.key);
                  return (
                    <div
                      key={field.key}
                      onClick={() => handleToggleField(field.key)}
                      className={`relative flex items-start gap-2 p-2.5 rounded-xl border transition select-none ${
                        field.required
                          ? 'bg-white border-emerald-300 shadow-xs'
                          : isChecked
                            ? field.key === 'gst_number'
                              ? 'bg-amber-50/80 border-amber-300 shadow-xs cursor-pointer'
                              : 'bg-white border-indigo-300 shadow-xs cursor-pointer hover:border-indigo-400'
                            : 'bg-slate-50/60 border-slate-200 text-slate-400 cursor-pointer hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={field.required}
                        onChange={() => {}}
                        className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`font-bold text-[11px] truncate ${isChecked ? 'text-slate-900' : 'text-slate-500'}`}>
                            {field.label}
                          </span>
                          {!field.required && (
                            <button
                              type="button"
                              title="Remove field"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteField(field.key);
                              }}
                              className="text-slate-300 hover:text-rose-500 transition shrink-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleRequired(field.key);
                            }}
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border transition ${
                              field.required
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700'
                            }`}
                          >
                            {field.required ? 'Required ✓' : 'Optional'}
                          </button>
                          {field.tag && field.tag !== 'Required' && field.tag !== 'Optional' && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${field.tagColor}`}>
                              {field.tag}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{field.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Custom Field Bar */}
              <div className="mt-3 pt-3 border-t border-indigo-100 flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newFieldLabel}
                  onChange={(e) => setNewFieldLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomField();
                    }
                  }}
                  placeholder="Add custom field name (e.g., Tender Name, WhatsApp No, Capacity)..."
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddCustomField}
                  disabled={!newFieldLabel.trim()}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Field
                </button>
                <button
                  type="button"
                  onClick={handleResetDefaultFields}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Default Fields
                </button>
              </div>
            </div>

            {/* STEP 2: Dynamic Batch Defaults */}
            <div className="border border-blue-200/80 bg-blue-50/40 rounded-2xl p-4">
              <button
                type="button"
                onClick={() => setShowDefaults(!showDefaults)}
                className="w-full flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <div>
                    <span className="font-black text-slate-900 text-xs group-hover:text-blue-700 transition">
                      Step 2: Dynamic Batch Defaults (Fallback for Missing / Unticked Fields)
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Applied automatically when file rows omit territory, category, or source.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-blue-600 font-bold text-xs bg-white px-2.5 py-1 rounded-lg border border-blue-200">
                  <span>{showDefaults ? 'Collapse' : 'Configure Defaults'}</span>
                  {showDefaults ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </div>
              </button>

              {showDefaults && (
                <div className="mt-4 pt-4 border-t border-blue-100 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Default State</label>
                    <select
                      value={batchDefaults.default_state}
                      onChange={(e) => handleDefaultChange({ default_state: e.target.value, default_district: '' })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Auto-infer from District --</option>
                      {availableStates.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Default District</label>
                    <select
                      value={batchDefaults.default_district}
                      onChange={(e) => handleDefaultChange({ default_district: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Use CSV District --</option>
                      {availableDistricts.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Default Cluster (Optional)</label>
                    <select
                      value={batchDefaults.default_cluster}
                      onChange={(e) => handleDefaultChange({ default_cluster: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Auto-resolve from District --</option>
                      {filteredClusters.map((c) => (
                        <option key={c._id} value={c.name}>
                          {c.name} {c.code ? `(${c.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Default EPC Category / Type</label>
                    <select
                      value={batchDefaults.default_epc_type}
                      onChange={(e) => handleDefaultChange({ default_epc_type: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Auto-Detect (Buyer / Verified / Registered)</option>
                      {epcTypes.map((t) => (
                        <option key={t._id || t.name} value={t.name}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Default Lead Source</label>
                    <select
                      value={batchDefaults.default_lead_source}
                      onChange={(e) => handleDefaultChange({ default_lead_source: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {LEAD_SOURCE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Default Remarks</label>
                    <input
                      type="text"
                      value={batchDefaults.default_remarks}
                      onChange={(e) => handleDefaultChange({ default_remarks: e.target.value })}
                      placeholder="Optional campaign note..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* File Dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer?.files?.[0]) handleFile(e.dataTransfer.files[0]);
              }}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition ${
                dragOver ? 'border-indigo-500 bg-indigo-50/70' : 'border-slate-300 bg-slate-50/60 hover:border-indigo-400'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  {parsing ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
                </div>
                <p className="font-bold text-slate-800">
                  {fileName ? `Loaded: ${fileName} (${rawRecords.length} rows)` : 'Drag & drop .xlsx or .csv file here, or click to browse'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <label className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer transition">
                    Choose File
                    <input
                      type="file"
                      accept=".csv,.xlsx,.tsv,.txt"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleFile(e.target.files[0]);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      downloadDynamicSampleTemplate({
                        fileName: 'BDE_EPC_Leads_Sample.csv',
                        fieldOptions: managedFieldOptions,
                        activeFieldKeys,
                        sampleRows: BDE_SAMPLE_ROWS,
                      })
                    }
                    className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold flex items-center gap-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Sample CSV
                  </button>
                </div>
              </div>
            </div>

            {/* Auto-Renamed Column Mapping Preview */}
            {headerMappings.length > 0 && (
              <div className="border border-slate-200 rounded-2xl p-4 bg-white">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-black text-slate-900">
                    Column Mapping (Auto-Renamed to Database Fields)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {headerMappings.filter((m) => !m.skip).length} of {headerMappings.length} columns mapped
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {headerMappings.map((m) => (
                    <div key={m.rawHeader} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-800 truncate">File: {m.rawHeader}</span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            m.matchType === 'exact'
                              ? 'bg-emerald-100 text-emerald-700'
                              : m.matchType === 'alias'
                                ? 'bg-indigo-100 text-indigo-700'
                                : m.matchType === 'fuzzy'
                                  ? 'bg-purple-100 text-purple-700'
                                  : m.isCustom
                                    ? 'bg-violet-100 text-violet-700'
                                    : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {m.matchType === 'exact'
                            ? 'Exact DB Match'
                            : m.matchType === 'alias'
                              ? 'Auto-Renamed to DB'
                              : m.matchType === 'fuzzy'
                                ? 'Smart Auto-Matched'
                                : m.isCustom
                                  ? 'Custom Field'
                                  : 'Skipped'}
                        </span>
                      </div>
                      <select
                        value={m.skip ? '__skip__' : m.isCustom ? `__custom__:${m.targetKey}` : m.targetKey}
                        onChange={(e) => handleMappingChange(m.rawHeader, e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-[11px]"
                      >
                        <option value="__skip__">-- Skip Column --</option>
                        {managedFieldOptions.map((f) => (
                          <option key={f.key} value={f.key}>
                            DB: {f.label} [{f.key}]
                          </option>
                        ))}
                        <option value={`__custom__:${slugifyHeaderKey(m.rawHeader)}`}>
                          Custom: {m.rawHeader}
                        </option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 3: Review & Inline Correction Grid */}
            {previewRows.length > 0 && (
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="font-black text-slate-900">Step 3: Review & Inline Correction Grid</h4>
                    <p className="text-[11px] text-slate-500">
                      Click any cell to fix values before importing. Cluster & State are resolved live.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFilterTab('all')}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                        filterTab === 'all' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700'
                      }`}
                    >
                      All ({previewRows.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterTab('valid')}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                        filterTab === 'valid' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                      }`}
                    >
                      Ready ({validRows.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterTab('errors')}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                        filterTab === 'errors' ? 'bg-rose-600 text-white' : 'bg-rose-50 border border-rose-200 text-rose-700'
                      }`}
                    >
                      Needs Fix ({errorRows.length})
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2 border-b border-slate-200">#</th>
                        <th className="px-3 py-2 border-b border-slate-200">Status</th>
                        <th className="px-3 py-2 border-b border-slate-200">Auto Cluster & State</th>
                        {visibleColumns.map((col) => (
                          <th key={col.key} className="px-3 py-2 border-b border-slate-200 min-w-[140px]">
                            {col.label}
                          </th>
                        ))}
                        <th className="px-3 py-2 border-b border-slate-200 text-center">Del</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayedRows.map((row) => {
                        const errList = Object.values(row._errors || {});
                        return (
                          <tr key={row._rowIndex} className={row._isValid ? 'bg-white' : 'bg-rose-50/40'}>
                            <td className="px-3 py-2 text-slate-400 font-bold">{row._rowIndex}</td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {row._isValid ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                                  <CheckCircle2 className="w-3 h-3" /> Ready
                                </span>
                              ) : (
                                <span
                                  title={errList.join(', ')}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px]"
                                >
                                  <AlertCircle className="w-3 h-3" /> Fix ({errList.length})
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {row._resolvedCluster?.cluster_name ? (
                                <div>
                                  <span className="inline-block px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-[10px]">
                                    {row._resolvedCluster.cluster_name}
                                    {row._resolvedCluster.cluster_code ? ` (${row._resolvedCluster.cluster_code})` : ''}
                                  </span>
                                  {row._resolvedCluster.state_name && (
                                    <div className="text-[10px] text-slate-500 mt-0.5">{row._resolvedCluster.state_name}</div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">No cluster match</span>
                              )}
                            </td>
                            {visibleColumns.map((col) => {
                              const cellErr = row._errors?.[col.key];
                              return (
                                <td key={col.key} className="px-2 py-1.5">
                                  <input
                                    type="text"
                                    value={row[col.key] ?? ''}
                                    onChange={(e) => handleCellEdit(row._rowIndex, col.key, e.target.value)}
                                    placeholder={col.required ? 'Required' : '—'}
                                    className={`w-full px-2 py-1 rounded-lg border text-[11px] focus:outline-none focus:ring-1 ${
                                      cellErr
                                        ? 'border-rose-400 bg-rose-50 text-rose-800 focus:ring-rose-500'
                                        : 'border-slate-200 bg-white text-slate-800 focus:ring-indigo-500'
                                    }`}
                                  />
                                  {cellErr && <div className="text-[9px] text-rose-600 mt-0.5">{cellErr}</div>}
                                </td>
                              );
                            })}
                            <td className="px-2 py-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteRow(row._rowIndex)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {!importResult && (
          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4 shrink-0 text-xs">
            <span className="text-slate-500 font-medium">
              {previewRows.length === 0
                ? 'Select fields above and upload a CSV / Excel file to preview.'
                : `${validRows.length} ready to import • ${errorRows.length} need inline fix`}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting || validRows.length === 0}
                onClick={handleSubmitImport}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold flex items-center gap-2 transition"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Import {validRows.length} Leads
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
