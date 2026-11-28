import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FiX,
  FiCheckSquare,
  FiUploadCloud,
  FiDownload,
  FiChevronDown,
  FiChevronUp,
  FiCheckCircle,
  FiAlertTriangle,
  FiTrash2,
  FiPlus,
  FiSliders,
  FiFileText,
  FiArrowRight,
  FiRefreshCw,
} from 'react-icons/fi';
import {
  parseSpreadsheetFile,
  autoMapFileHeaders,
  buildValidatedPreviewRows,
  revalidateSingleRow,
  downloadDynamicSampleTemplate,
  slugifyHeaderKey,
  buildClientClusterResolver,
} from './parseSpreadsheetFile';
import {
  fetchBulkUploadStates,
  fetchBulkUploadDistricts,
  fetchBulkUploadClusters,
  fetchBulkUploadAllClusters,
  fetchBulkUploadEpcTypes,
  fetchBulkUploadLeadSources,
} from './fetchBulkUploadMetadata';

const MATCH_BADGE_MAP = {
  exact_key: { label: 'Exact DB Match', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800' },
  exact_label: { label: 'Exact Label', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800' },
  auto_alias: { label: 'Auto-Renamed to DB', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800' },
  smart_rename: { label: 'Smart Auto-Matched', cls: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800' },
  manual: { label: 'Mapped Manually', cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800' },
  extra_custom: { label: 'Extra DB Field', cls: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800' },
  unmapped: { label: 'Skipped', cls: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' },
};

/**
 * Unified BDE-Parity 3-Step Dynamic Bulk Upload Modal.
 * Features:
 * - Step 1: Selectable Field Checkboxes + Quick Presets (+ optional extra custom column capture)
 * - Step 2: Live MongoDB Batch Defaults (States, cascading Districts & Clusters, EPC Types, Lead Sources)
 * - Smart Column Translator: Automatically detects, renames & maps varying file column headers to DB fields on upload
 * - Step 3: Interactive Review & Inline Editing Grid + Option B Duplicate Conflict Report
 */
export default function DynamicBulkUploadModal({
  isOpen,
  onClose,
  title = 'Bulk Upload Leads & EPCs',
  subtitle = 'Import leads in bulk via Excel (.xlsx) or CSV with dynamic batch defaults, automatic column renaming, and live inline correction',
  badgeText = '100–200+ Leads Support',
  fieldOptions = [],
  presets = [],
  defaultSelectedKeys = [],
  enableDefaultFields = {
    state: true,
    district: true,
    cluster: false,
    epcType: false,
    leadSource: false,
    remarks: false,
  },
  allowCustomColumns = true,
  customColumnsDefaultOn = false,
  sampleFileName = 'dynamic_upload_template.csv',
  sampleRows = [],
  submitLabel = 'Import Leads',
  initialBatchDefaults = {},
  leadSourcesOptions = null,
  renderExtraBatchDefaults = null,
  onSubmitImport,
}) {
  const fileInputRef = useRef(null);

  // Step 1: Managed field schema (supports dynamic Add / Delete fields) & active keys
  const [managedFieldOptions, setManagedFieldOptions] = useState(fieldOptions);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldNotice, setNewFieldNotice] = useState('');
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [captureCustomColumns, setCaptureCustomColumns] = useState(customColumnsDefaultOn);
  const [showDefaultsPanel, setShowDefaultsPanel] = useState(true);

  // Step 2: Live MongoDB metadata for Batch Defaults
  const [statesList, setStatesList] = useState([]);
  const [districtsList, setDistrictsList] = useState([]);
  const [clustersList, setClustersList] = useState([]);
  const [allIndiaClusters, setAllIndiaClusters] = useState([]);
  const [epcTypesList, setEpcTypesList] = useState([]);
  const [leadSourcesList, setLeadSourcesList] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(false);

  const [batchDefaults, setBatchDefaults] = useState({
    default_state_id: '',
    default_state: '',
    default_district: '',
    default_cluster: '',
    default_epc_type: '',
    default_lead_source: '',
    default_remarks: '',
  });

  // Uploaded spreadsheet state + Dynamic Auto-Mapping
  const [fileName, setFileName] = useState('');
  const [rawHeaders, setRawHeaders] = useState([]);
  const [rawRecords, setRawRecords] = useState([]);
  const [headerMappings, setHeaderMappings] = useState([]);
  const [parseError, setParseError] = useState('');
  const [parsingFile, setParsingFile] = useState(false);

  // Step 3: Editable preview rows + filter
  const [previewRows, setPreviewRows] = useState([]);
  const [reviewFilter, setReviewFilter] = useState('all'); // 'all' | 'valid' | 'errors'
  const [showColumnMapper, setShowColumnMapper] = useState(true);

  // Submission & Option B duplicate result state
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  // Initialize Step 1 defaults & fetch live DB metadata when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setManagedFieldOptions(fieldOptions);
    setNewFieldLabel('');
    setNewFieldNotice('');
    const reqKeys = fieldOptions.filter((f) => f.required).map((f) => f.key);
    const initial = Array.from(new Set([...reqKeys, ...defaultSelectedKeys]));
    setSelectedKeys(initial.length > 0 ? initial : fieldOptions.map((f) => f.key));
    setCaptureCustomColumns(customColumnsDefaultOn);
    setFileName('');
    setRawHeaders([]);
    setRawRecords([]);
    setHeaderMappings([]);
    setPreviewRows([]);
    setParseError('');
    setSubmitResult(null);
    setReviewFilter('all');
    setBatchDefaults({
      default_state_id: '',
      default_state: '',
      default_district: '',
      default_cluster: '',
      default_epc_type: '',
      default_lead_source: '',
      default_remarks: '',
      ...(initialBatchDefaults || {}),
    });

    const hasLeadSourceOverride = Array.isArray(leadSourcesOptions);
    setLoadingMeta(true);
    Promise.all([
      enableDefaultFields?.state ? fetchBulkUploadStates() : Promise.resolve([]),
      enableDefaultFields?.epcType ? fetchBulkUploadEpcTypes() : Promise.resolve([]),
      enableDefaultFields?.leadSource
        ? (hasLeadSourceOverride ? Promise.resolve(leadSourcesOptions) : fetchBulkUploadLeadSources())
        : Promise.resolve([]),
      fetchBulkUploadAllClusters(),
    ])
      .then(([states, epcTypes, sources, allClus]) => {
        setStatesList(states || []);
        setEpcTypesList(epcTypes || []);
        setLeadSourcesList(sources || []);
        setAllIndiaClusters(allClus || []);
      })
      .finally(() => setLoadingMeta(false));
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && Array.isArray(leadSourcesOptions) && leadSourcesOptions.length > 0) {
      setLeadSourcesList(leadSourcesOptions);
    }
  }, [isOpen, leadSourcesOptions]);

  const clusterResolver = useMemo(
    () => buildClientClusterResolver(allIndiaClusters),
    [allIndiaClusters]
  );

  // Re-evaluate loaded preview rows whenever live Franchisee Clusters finish loading
  useEffect(() => {
    if (isOpen && rawRecords.length > 0 && allIndiaClusters.length > 0) {
      recomputeRows(rawRecords, headerMappings, selectedKeys, batchDefaults, captureCustomColumns, managedFieldOptions);
    }
  }, [allIndiaClusters]);

  // Cascading live Districts & Clusters whenever Default State changes
  useEffect(() => {
    if (!isOpen) return;
    if (!batchDefaults.default_state_id && !batchDefaults.default_state) {
      setDistrictsList([]);
      setClustersList([]);
      return;
    }
    const query = { stateId: batchDefaults.default_state_id, stateName: batchDefaults.default_state };
    Promise.all([
      enableDefaultFields?.district ? fetchBulkUploadDistricts(query) : Promise.resolve([]),
      enableDefaultFields?.cluster ? fetchBulkUploadClusters(query) : Promise.resolve([]),
    ]).then(([dists, clus]) => {
      setDistrictsList(dists || []);
      setClustersList(clus || []);
    });
  }, [isOpen, batchDefaults.default_state_id, batchDefaults.default_state]);

  // Re-evaluate rows cleanly whenever Step 1 checkboxes, schema, header mappings, or Step 2 defaults change
  const recomputeRows = (
    recordsToUse,
    mappingsToUse,
    activeKeysToUse,
    defaultsToUse,
    allowCustom,
    fieldOptionsToUse = managedFieldOptions
  ) => {
    if (!recordsToUse || recordsToUse.length === 0) {
      setPreviewRows([]);
      return;
    }
    const { rows } = buildValidatedPreviewRows({
      records: recordsToUse,
      headerMappings: mappingsToUse,
      activeFieldKeys: activeKeysToUse,
      fieldOptions: fieldOptionsToUse,
      batchDefaults: defaultsToUse,
      allowCustomColumns: allowCustom,
      clusterResolver,
    });
    setPreviewRows(rows);
  };

  const remapLoadedHeadersForSchema = (nextFieldOptions, currentSelectedKeys) => {
    if (rawHeaders.length === 0 || rawRecords.length === 0) return;
    const { headerMappings: freshMappings, autoActivatedKeys } = autoMapFileHeaders(
      rawHeaders,
      nextFieldOptions,
      rawRecords,
      { allowCustomColumns: captureCustomColumns }
    );
    const existingByHeader = new Map(headerMappings.map((m) => [m.rawHeader, m]));
    const nextKeySet = new Set(nextFieldOptions.map((f) => f.key));

    const mergedMappings = freshMappings.map((freshM) => {
      const prevM = existingByHeader.get(freshM.rawHeader);
      if (prevM && prevM.matchedVia === 'manual' && !prevM.skip && !prevM.isCustom && nextKeySet.has(prevM.targetKey)) {
        return prevM;
      }
      if (prevM && prevM.skip && (freshM.skip || freshM.isCustom)) {
        return prevM;
      }
      return freshM;
    });

    const reqKeys = nextFieldOptions.filter((f) => f.required).map((f) => f.key);
    const nextSelected = Array.from(
      new Set([...reqKeys, ...currentSelectedKeys, ...autoActivatedKeys].filter((k) => nextKeySet.has(k)))
    );

    setHeaderMappings(mergedMappings);
    setSelectedKeys(nextSelected);
    recomputeRows(rawRecords, mergedMappings, nextSelected, batchDefaults, captureCustomColumns, nextFieldOptions);
  };

  const handleToggleField = (fieldKey) => {
    const target = managedFieldOptions.find((f) => f.key === fieldKey);
    if (target?.required) return;
    setSelectedKeys((prev) => {
      const exists = prev.includes(fieldKey);
      const next = exists ? prev.filter((k) => k !== fieldKey) : [...prev, fieldKey];
      if (rawRecords.length > 0) {
        recomputeRows(rawRecords, headerMappings, next, batchDefaults, captureCustomColumns, managedFieldOptions);
      }
      return next;
    });
  };

  // Toggle whether a Step 1 field is Required vs Optional
  const handleToggleRequired = (fieldKey) => {
    const nextFieldOptions = managedFieldOptions.map((f) =>
      f.key === fieldKey ? { ...f, required: !f.required } : f
    );
    const updatedTarget = nextFieldOptions.find((f) => f.key === fieldKey);
    const nextSelected =
      updatedTarget?.required && !selectedKeys.includes(fieldKey)
        ? [...selectedKeys, fieldKey]
        : selectedKeys;

    setManagedFieldOptions(nextFieldOptions);
    if (nextSelected !== selectedKeys) {
      setSelectedKeys(nextSelected);
    }
    if (rawRecords.length > 0) {
      recomputeRows(rawRecords, headerMappings, nextSelected, batchDefaults, captureCustomColumns, nextFieldOptions);
    }
  };

  const handleAddCustomField = () => {
    const trimmedLabel = newFieldLabel.trim();
    if (!trimmedLabel) {
      setNewFieldNotice('Please enter a field name first.');
      return;
    }

    const baseKey = slugifyHeaderKey(trimmedLabel, managedFieldOptions.length);
    const existingMatch = managedFieldOptions.find(
      (f) => f.label.trim().toLowerCase() === trimmedLabel.toLowerCase() || f.key === baseKey
    );

    if (existingMatch) {
      if (!selectedKeys.includes(existingMatch.key) && !existingMatch.required) {
        const nextSelected = [...selectedKeys, existingMatch.key];
        setSelectedKeys(nextSelected);
        if (rawRecords.length > 0) {
          recomputeRows(rawRecords, headerMappings, nextSelected, batchDefaults, captureCustomColumns, managedFieldOptions);
        }
      }
      setNewFieldLabel('');
      setNewFieldNotice(`"${existingMatch.label}" already exists — activated in Step 1.`);
      return;
    }

    let uniqueKey = baseKey;
    let suffix = 2;
    const usedKeys = new Set(managedFieldOptions.map((f) => f.key));
    while (usedKeys.has(uniqueKey) || uniqueKey === '__skip__' || uniqueKey === '__custom__') {
      uniqueKey = `${baseKey}_${suffix}`;
      suffix += 1;
    }

    const newField = {
      key: uniqueKey,
      label: trimmedLabel,
      description: 'Custom field (editable & DB synced)',
      required: false,
      category: 'Custom',
      isCustomField: true,
      aliases: [trimmedLabel, uniqueKey],
    };

    const nextFieldOptions = [...managedFieldOptions, newField];
    const nextSelected = Array.from(new Set([...selectedKeys, uniqueKey]));

    setManagedFieldOptions(nextFieldOptions);
    setSelectedKeys(nextSelected);
    setNewFieldLabel('');
    setNewFieldNotice('');

    if (rawHeaders.length > 0 && rawRecords.length > 0) {
      remapLoadedHeadersForSchema(nextFieldOptions, nextSelected);
    }
  };

  const handleDeleteField = (fieldKey) => {
    const target = managedFieldOptions.find((f) => f.key === fieldKey);
    if (!target || target.required) return;

    const nextFieldOptions = managedFieldOptions.filter((f) => f.key !== fieldKey);
    const nextSelected = selectedKeys.filter((k) => k !== fieldKey);

    setManagedFieldOptions(nextFieldOptions);
    setSelectedKeys(nextSelected);
    setNewFieldNotice('');

    if (rawRecords.length > 0) {
      const nextMappings = headerMappings.map((m, idx) => {
        if (!m.skip && !m.isCustom && m.targetKey === fieldKey) {
          return {
            ...m,
            targetKey: slugifyHeaderKey(m.rawHeader, idx),
            targetLabel: m.rawHeader,
            skip: !captureCustomColumns,
            isCustom: captureCustomColumns,
            matchedVia: captureCustomColumns ? 'extra_custom' : 'unmapped',
          };
        }
        return m;
      });
      setHeaderMappings(nextMappings);
      recomputeRows(rawRecords, nextMappings, nextSelected, batchDefaults, captureCustomColumns, nextFieldOptions);
    }
  };

  const handleResetDefaultFields = () => {
    const reqKeys = fieldOptions.filter((f) => f.required).map((f) => f.key);
    const initial = Array.from(new Set([...reqKeys, ...defaultSelectedKeys]));
    const nextSelected = initial.length > 0 ? initial : fieldOptions.map((f) => f.key);
    setManagedFieldOptions(fieldOptions);
    setSelectedKeys(nextSelected);
    setNewFieldNotice('');

    if (rawHeaders.length > 0 && rawRecords.length > 0) {
      remapLoadedHeadersForSchema(fieldOptions, nextSelected);
    }
  };

  const handleApplyPreset = (preset) => {
    const existingKeySet = new Set(managedFieldOptions.map((f) => f.key));
    const reqKeys = managedFieldOptions.filter((f) => f.required).map((f) => f.key);
    const targetPresetKeys =
      preset.id === 'all'
        ? managedFieldOptions.map((f) => f.key)
        : (preset.keys || []).filter((k) => existingKeySet.has(k));
    const next = Array.from(new Set([...reqKeys, ...targetPresetKeys]));
    setSelectedKeys(next);
    if (rawRecords.length > 0) {
      recomputeRows(rawRecords, headerMappings, next, batchDefaults, captureCustomColumns, managedFieldOptions);
    }
  };

  const handleBatchDefaultChange = (patch) => {
    setBatchDefaults((prev) => {
      const next = { ...prev, ...patch };
      if (rawRecords.length > 0) {
        recomputeRows(rawRecords, headerMappings, selectedKeys, next, captureCustomColumns, managedFieldOptions);
      }
      return next;
    });
  };

  const handleFileSelected = async (file) => {
    if (!file) return;
    setParsingFile(true);
    setParseError('');
    setSubmitResult(null);

    try {
      const { headers, records, fileName: parsedName } = await parseSpreadsheetFile(file);
      if (headers.length === 0 || records.length === 0) {
        setParseError('The uploaded file appears empty or contains only headers.');
        setParsingFile(false);
        return;
      }

      const { headerMappings: autoMappings, autoActivatedKeys } = autoMapFileHeaders(
        headers,
        managedFieldOptions,
        records,
        { allowCustomColumns: captureCustomColumns }
      );

      // Dynamically enable Step 1 checkboxes for every DB field found inside the uploaded file
      const reqKeys = managedFieldOptions.filter((f) => f.required).map((f) => f.key);
      const nextSelected = Array.from(new Set([...reqKeys, ...selectedKeys, ...autoActivatedKeys]));

      setFileName(parsedName);
      setRawHeaders(headers);
      setRawRecords(records);
      setHeaderMappings(autoMappings);
      setSelectedKeys(nextSelected);
      setShowColumnMapper(true);

      recomputeRows(records, autoMappings, nextSelected, batchDefaults, captureCustomColumns, managedFieldOptions);
    } catch (err) {
      setParseError(err.message || 'Failed to parse spreadsheet file.');
    } finally {
      setParsingFile(false);
    }
  };

  // Allows user to dynamically change which Database field an uploaded file column maps into
  const handleReassignColumnMapping = (rawHeader, newTargetValue) => {
    const nextMappings = headerMappings.map((m, idx) => {
      if (m.rawHeader !== rawHeader) return m;
      if (newTargetValue === '__skip__') {
        return { ...m, skip: true, isCustom: false, matchedVia: 'unmapped' };
      }
      if (newTargetValue === '__custom__') {
        const customKey = slugifyHeaderKey(rawHeader, idx);
        return {
          ...m,
          targetKey: customKey,
          targetLabel: rawHeader,
          skip: false,
          isCustom: true,
          matchedVia: 'extra_custom',
        };
      }
      const fieldMeta = managedFieldOptions.find((f) => f.key === newTargetValue);
      return {
        ...m,
        targetKey: newTargetValue,
        targetLabel: fieldMeta?.label || newTargetValue,
        skip: false,
        isCustom: false,
        matchedVia: 'manual',
      };
    });

    let nextSelected = [...selectedKeys];
    if (newTargetValue !== '__skip__' && newTargetValue !== '__custom__' && !nextSelected.includes(newTargetValue)) {
      nextSelected.push(newTargetValue);
      setSelectedKeys(nextSelected);
    }

    setHeaderMappings(nextMappings);
    recomputeRows(rawRecords, nextMappings, nextSelected, batchDefaults, captureCustomColumns, managedFieldOptions);
  };

  const handleToggleCustomMode = (checked) => {
    setCaptureCustomColumns(checked);
    const nextMappings = headerMappings.map((m) => {
      if (m.matchedVia === 'extra_custom' || m.matchedVia === 'unmapped') {
        return {
          ...m,
          skip: !checked,
          isCustom: checked,
          matchedVia: checked ? 'extra_custom' : 'unmapped',
        };
      }
      return m;
    });
    setHeaderMappings(nextMappings);
    if (rawRecords.length > 0) {
      recomputeRows(rawRecords, nextMappings, selectedKeys, batchDefaults, checked);
    }
  };

  const handleInlineCellEdit = (rowIndex, fieldKey, value) => {
    setPreviewRows((prev) =>
      prev.map((r) => {
        if (r._rowIndex !== rowIndex) return r;
        const updated = { ...r, [fieldKey]: value };
        return revalidateSingleRow(updated, managedFieldOptions, selectedKeys, batchDefaults, clusterResolver);
      })
    );
  };

  const handleRemovePreviewRow = (rowIndex) => {
    setPreviewRows((prev) => prev.filter((r) => r._rowIndex !== rowIndex));
  };

  const activeFieldList = useMemo(
    () => managedFieldOptions.filter((f) => f.required || selectedKeys.includes(f.key)),
    [managedFieldOptions, selectedKeys]
  );

  const isFieldSchemaCustomized = useMemo(
    () =>
      managedFieldOptions.length !== fieldOptions.length ||
      managedFieldOptions.some(
        (f, idx) =>
          fieldOptions[idx]?.key !== f.key ||
          Boolean(fieldOptions[idx]?.required) !== Boolean(f.required)
      ),
    [managedFieldOptions, fieldOptions]
  );

  const customMappedColumns = useMemo(
    () => (captureCustomColumns ? headerMappings.filter((m) => !m.skip && m.isCustom) : []),
    [captureCustomColumns, headerMappings]
  );

  const mappedColumnsCount = useMemo(
    () => headerMappings.filter((m) => !m.skip).length,
    [headerMappings]
  );

  const renamedCount = useMemo(
    () => headerMappings.filter((m) => !m.skip && ['auto_alias', 'smart_rename'].includes(m.matchedVia)).length,
    [headerMappings]
  );

  const validRows = useMemo(() => previewRows.filter((r) => r._isValid), [previewRows]);
  const errorRows = useMemo(() => previewRows.filter((r) => !r._isValid), [previewRows]);

  const filteredPreviewRows = useMemo(() => {
    if (reviewFilter === 'valid') return validRows;
    if (reviewFilter === 'errors') return errorRows;
    return previewRows;
  }, [previewRows, validRows, errorRows, reviewFilter]);

  const handleConfirmImport = async () => {
    if (validRows.length === 0 || typeof onSubmitImport !== 'function') return;
    setSubmitting(true);
    setParseError('');
    try {
      const customFieldsMeta = managedFieldOptions.filter((f) => f.isCustomField);
      const requiredFields = managedFieldOptions.filter((f) => f.required).map((f) => f.key);
      const preparedValidRows = validRows.map((row) => {
        const mergedCustom = { ...(row._customFields || {}) };
        customFieldsMeta.forEach((f) => {
          if (selectedKeys.includes(f.key) && row[f.key] !== undefined && String(row[f.key]).trim() !== '') {
            mergedCustom[f.key] = String(row[f.key]).trim();
          }
        });
        return {
          ...row,
          cluster_id: row._resolvedCluster?.cluster_id || row.cluster_id || null,
          cluster_name: row.cluster_name || row.cluster || row._resolvedCluster?.cluster_name || '',
          cluster_code: row._resolvedCluster?.cluster_code || row.cluster_code || '',
          _customFields: mergedCustom,
        };
      });

      const res = await onSubmitImport(preparedValidRows, {
        allRows: previewRows,
        fileName,
        rawHeaders,
        headerMappings,
        activeFieldKeys: selectedKeys,
        activeFields: activeFieldList,
        requiredFields,
        fieldOptions: managedFieldOptions,
        batchDefaults,
        captureCustomColumns,
      });
      setSubmitResult(res || { success: true, message: `Imported ${preparedValidRows.length} record(s).` });
    } catch (err) {
      setParseError(err?.response?.data?.message || err?.message || 'Bulk upload failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-6xl max-h-[93vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 bg-white dark:bg-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
              <FiFileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black text-slate-900 dark:text-white truncate">{title}</h2>
                {badgeText && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    {badgeText}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{subtitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer shrink-0"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/40 dark:bg-slate-900/20">
          {/* STEP 1: CHOOSE FIELDS CHECKBOXES + QUICK PRESETS */}
          <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/70 bg-white dark:bg-slate-800 p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-bold">
                  <FiCheckSquare className="w-3.5 h-3.5" />
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    Step 1: Choose Fields to Extract from CSV / Excel
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Tick fields to extract. Click any field&apos;s <span className="font-bold text-emerald-700 dark:text-emerald-300">Required</span> / <span className="font-bold text-slate-600 dark:text-slate-300">Optional</span> pill to choose what is mandatory, or add/delete fields below.
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {activeFieldList.length} of {managedFieldOptions.length} Active • {managedFieldOptions.filter((f) => f.required).length} Required
                </span>
              </div>

              {presets.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">Presets:</span>
                  {presets.map((p) => {
                    const existingKeySet = new Set(managedFieldOptions.map((f) => f.key));
                    const targetKeys =
                      p.id === 'all'
                        ? managedFieldOptions.map((f) => f.key)
                        : (p.keys || []).filter((k) => existingKeySet.has(k));
                    const isMatch =
                      targetKeys.every((k) => selectedKeys.includes(k)) &&
                      selectedKeys.filter((k) => !managedFieldOptions.find((f) => f.key === k)?.required).length ===
                        targetKeys.filter((k) => !managedFieldOptions.find((f) => f.key === k)?.required).length;
                    return (
                      <button
                        key={p.id || p.label}
                        type="button"
                        onClick={() => handleApplyPreset(p)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                          isMatch
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {managedFieldOptions.map((field) => {
                const isChecked = field.required || selectedKeys.includes(field.key);
                return (
                  <div
                    key={field.key}
                    onClick={() => !field.required && handleToggleField(field.key)}
                    className={`p-2.5 rounded-xl border transition-all flex items-start gap-2.5 select-none ${
                      field.required ? 'cursor-default' : 'cursor-pointer'
                    } ${
                      isChecked
                        ? field.highlight
                          ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700'
                          : 'bg-indigo-50/40 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700'
                        : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={field.required}
                      onChange={() => handleToggleField(field.key)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-0.5 rounded-sm accent-indigo-600 cursor-pointer disabled:cursor-default"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                          <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate">
                            {field.label}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleRequired(field.key);
                            }}
                            title={field.required ? 'Required — click to make Optional' : 'Optional — click to mark Required'}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer shrink-0 ${
                              field.required
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800'
                                : 'bg-slate-100 text-slate-600 border-slate-200 hover:border-indigo-400 hover:text-indigo-700 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                            }`}
                          >
                            {field.required ? 'Required ✓' : 'Optional'}
                          </button>
                          {!field.required && field.category && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-semibold shrink-0 ${
                                field.isCustomField
                                  ? 'bg-violet-100 text-violet-700 dark:bg-violet-950/70 dark:text-violet-300'
                                  : 'bg-slate-100/80 text-slate-500 dark:bg-slate-800/80 dark:text-slate-400'
                              }`}
                            >
                              {field.category}
                            </span>
                          )}
                        </div>
                        {!field.required && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteField(field.key);
                            }}
                            title={`Delete "${field.label}" field`}
                            aria-label={`Delete ${field.label}`}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer shrink-0"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      {field.description && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                          {field.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Step 1 Custom Field Creator & Reset Controls */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={newFieldLabel}
                    onChange={(e) => {
                      setNewFieldLabel(e.target.value);
                      if (newFieldNotice) setNewFieldNotice('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomField();
                      }
                    }}
                    placeholder="Add custom field name (e.g., Tender Name, WhatsApp No, Capacity)..."
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomField}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
                  >
                    <FiPlus className="w-3.5 h-3.5" />
                    Add Field
                  </button>
                </div>

                {isFieldSchemaCustomized && (
                  <button
                    type="button"
                    onClick={handleResetDefaultFields}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <FiRefreshCw className="w-3 h-3" />
                    Reset Default Fields
                  </button>
                )}
              </div>

              {newFieldNotice && (
                <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">{newFieldNotice}</p>
              )}

              {allowCustomColumns && (
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={captureCustomColumns}
                      onChange={(e) => handleToggleCustomMode(e.target.checked)}
                      className="rounded-sm accent-amber-600"
                    />
                    <span>
                      Auto-Capture Unmapped Extra Columns (e.g., Meta Lead Ads custom survey questions) as Custom DB Fields
                    </span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* STEP 2: DYNAMIC BATCH DEFAULTS (100% Live MongoDB Dropdowns) */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FiSliders className="text-indigo-600 w-4 h-4" />
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    Step 2: Dynamic Batch Defaults (Fallback for Missing / Unticked Fields)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Fetched dynamically from live database — automatically applied only where file rows omit these values
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDefaultsPanel((v) => !v)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-indigo-600 dark:text-indigo-300 flex items-center gap-1 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                {showDefaultsPanel ? (
                  <>
                    Collapse <FiChevronUp />
                  </>
                ) : (
                  <>
                    Expand <FiChevronDown />
                  </>
                )}
              </button>
            </div>

            {showDefaultsPanel && (
              <div className="space-y-3 pt-1">
                {typeof renderExtraBatchDefaults === 'function' &&
                  renderExtraBatchDefaults({
                    batchDefaults,
                    handleBatchDefaultChange,
                    setBatchDefaults,
                  })}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {enableDefaultFields?.state && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Default State {loadingMeta ? '(Loading...)' : ''}
                    </label>
                    <select
                      value={batchDefaults.default_state_id}
                      onChange={(e) => {
                        const sid = e.target.value;
                        const matched = statesList.find((s) => String(s._id || s.id) === sid);
                        handleBatchDefaultChange({
                          default_state_id: sid,
                          default_state: matched?.name || '',
                          default_district: '',
                          default_cluster: '',
                        });
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white"
                    >
                      <option value="">-- Auto-detect from file --</option>
                      {statesList.map((st) => (
                        <option key={st._id || st.id} value={st._id || st.id}>
                          {st.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {enableDefaultFields?.district && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Default District / City
                    </label>
                    <select
                      value={batchDefaults.default_district}
                      disabled={!batchDefaults.default_state_id}
                      onChange={(e) => handleBatchDefaultChange({ default_district: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white disabled:opacity-50"
                    >
                      <option value="">
                        {batchDefaults.default_state_id ? '-- Auto-detect from file --' : 'Select Default State first'}
                      </option>
                      {districtsList.map((d) => (
                        <option key={d._id || d.name} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {enableDefaultFields?.cluster && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Default Franchisee Cluster
                    </label>
                    <select
                      value={batchDefaults.default_cluster}
                      disabled={!batchDefaults.default_state_id}
                      onChange={(e) => handleBatchDefaultChange({ default_cluster: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white disabled:opacity-50"
                    >
                      <option value="">
                        {batchDefaults.default_state_id ? '-- Auto-match from DB --' : 'Select Default State first'}
                      </option>
                      {clustersList.map((c) => (
                        <option key={c._id} value={c.cluster_name}>
                          {c.cluster_name} ({c.cluster_code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {enableDefaultFields?.epcType && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Default EPC Classification Type
                    </label>
                    <select
                      value={batchDefaults.default_epc_type}
                      onChange={(e) => handleBatchDefaultChange({ default_epc_type: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white"
                    >
                      <option value="">-- Auto-classify from GST / Orders --</option>
                      {epcTypesList.map((t) => (
                        <option key={t._id || t.name} value={t.name}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {enableDefaultFields?.leadSource && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Default Lead Source
                    </label>
                    <select
                      value={batchDefaults.default_lead_source}
                      onChange={(e) => handleBatchDefaultChange({ default_lead_source: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white"
                    >
                      <option value="">-- Use file column / auto --</option>
                      {leadSourcesList.map((src) => (
                        <option key={src.value || src} value={src.value || src}>
                          {src.label || src}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {enableDefaultFields?.remarks && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Default Campaign Note / Remarks
                    </label>
                    <input
                      type="text"
                      value={batchDefaults.default_remarks}
                      onChange={(e) => handleBatchDefaultChange({ default_remarks: e.target.value })}
                      placeholder="Optional fallback note for missing rows"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white"
                    />
                  </div>
                )}
                </div>
              </div>
            )}
          </div>

          {/* FILE DROPZONE + DYNAMIC TEMPLATE DOWNLOAD */}
          <div className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-5 text-center space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-left flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600">
                  <FiUploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {fileName ? `Loaded: ${fileName} (${previewRows.length} rows)` : 'Upload Excel (.xlsx) or CSV File'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Supports Meta Lead Ads UTF-16 exports, standard CSV/TSV & Excel `.xlsx`. Column headers auto-rename to match DB fields.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap justify-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={parsingFile}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60"
                >
                  <FiUploadCloud className="w-4 h-4" />
                  {parsingFile ? 'Reading File...' : fileName ? 'Change File' : 'Choose Excel / CSV'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.csv,.tsv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelected(f);
                    e.target.value = '';
                  }}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() =>
                    downloadDynamicSampleTemplate({
                      fileName: sampleFileName,
                      fieldOptions: managedFieldOptions,
                      activeFieldKeys: selectedKeys,
                      sampleRows,
                    })
                  }
                  className="px-3.5 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <FiDownload className="w-3.5 h-3.5" />
                  Download Dynamic Sample ({activeFieldList.length} cols)
                </button>
              </div>
            </div>

            {parseError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold text-left flex items-center gap-2">
                <FiAlertTriangle className="shrink-0" /> {parseError}
              </div>
            )}
          </div>

          {/* DYNAMIC COLUMN AUTO-RENAMING & MAPPING TRANSLATOR */}
          {rawHeaders.length > 0 && (
            <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900 bg-white dark:bg-slate-800 p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <FiRefreshCw className="text-indigo-600 w-4 h-4" />
                    Auto-Matched & Renamed Columns (File Column → Database Field)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {mappedColumnsCount} of {rawHeaders.length} file columns mapped to database fields
                    {renamedCount > 0 ? ` • ${renamedCount} column name(s) automatically translated` : ''}.
                    Adjust any dropdown below to re-map live before saving.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowColumnMapper((v) => !v)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer"
                >
                  {showColumnMapper ? 'Hide Column Translator' : 'Show Column Translator'}
                </button>
              </div>

              {showColumnMapper && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                  {headerMappings.map((m) => {
                    const badge = MATCH_BADGE_MAP[m.matchedVia] || MATCH_BADGE_MAP.unmapped;
                    const selectVal = m.skip ? '__skip__' : m.isCustom ? '__custom__' : m.targetKey;
                    return (
                      <div
                        key={m.rawHeader}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate" title={m.rawHeader}>
                            File: {m.rawHeader}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold shrink-0 ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </div>
                        {m.sampleValue && (
                          <p className="text-[10px] text-slate-400 truncate">e.g., "{m.sampleValue}"</p>
                        )}
                        <div className="flex items-center gap-1.5">
                          <FiArrowRight className="text-indigo-500 w-3 h-3 shrink-0" />
                          <select
                            value={selectVal}
                            onChange={(e) => handleReassignColumnMapping(m.rawHeader, e.target.value)}
                            className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-semibold text-slate-900 dark:text-white"
                          >
                            {managedFieldOptions.map((f) => (
                              <option key={f.key} value={f.key}>
                                DB: {f.label} [{f.key}]
                              </option>
                            ))}
                            {allowCustomColumns && (
                              <option value="__custom__">
                                Custom Field [{slugifyHeaderKey(m.rawHeader)}]
                              </option>
                            )}
                            <option value="__skip__">-- Skip Column --</option>
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: INTERACTIVE REVIEW & INLINE CORRECTION GRID */}
          {previewRows.length > 0 && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    Step 3: Review & Inline Correction Grid
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Showing canonical Database column names. Click any cell to fix missing/invalid values before saving.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setReviewFilter('all')}
                    className={`px-3 py-1 rounded-lg border cursor-pointer ${
                      reviewFilter === 'all'
                        ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    All ({previewRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewFilter('valid')}
                    className={`px-3 py-1 rounded-lg border cursor-pointer ${
                      reviewFilter === 'valid'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    }`}
                  >
                    Ready ({validRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewFilter('errors')}
                    className={`px-3 py-1 rounded-lg border cursor-pointer ${
                      reviewFilter === 'errors'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    Needs Fix ({errorRows.length})
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-auto max-h-80">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-900/80 text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300 sticky top-0 z-10">
                    <tr>
                      <th className="px-2.5 py-2 border-b border-slate-200 dark:border-slate-700 w-10">#</th>
                      <th className="px-2.5 py-2 border-b border-slate-200 dark:border-slate-700 w-24">Status</th>
                      <th className="px-2.5 py-2 border-b border-slate-200 dark:border-slate-700 min-w-[165px]">
                        Auto Cluster & State
                      </th>
                      {activeFieldList.map((f) => {
                        const sourceMapping = headerMappings.find((m) => !m.skip && !m.isCustom && m.targetKey === f.key);
                        const wasRenamed = sourceMapping && sourceMapping.rawHeader.toLowerCase() !== f.label.toLowerCase();
                        return (
                          <th key={f.key} className="px-2.5 py-2 border-b border-slate-200 dark:border-slate-700 min-w-[140px]">
                            <div>{f.label}</div>
                            {wasRenamed && (
                              <div className="text-[9px] font-normal normal-case text-indigo-600 dark:text-indigo-400">
                                from "{sourceMapping.rawHeader}"
                              </div>
                            )}
                          </th>
                        );
                      })}
                      {customMappedColumns.length > 0 && (
                        <th className="px-2.5 py-2 border-b border-slate-200 dark:border-slate-700 min-w-[180px]">
                          Extra Custom Fields ({customMappedColumns.length})
                        </th>
                      )}
                      <th className="px-2.5 py-2 border-b border-slate-200 dark:border-slate-700 text-right w-12">Del</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {filteredPreviewRows.map((row) => (
                      <tr key={row._rowIndex} className={row._isValid ? 'hover:bg-slate-50/70 dark:hover:bg-slate-800/50' : 'bg-rose-50/30 dark:bg-rose-950/10'}>
                        <td className="px-2.5 py-1.5 text-[11px] font-mono text-slate-400">{row._rowIndex}</td>
                        <td className="px-2.5 py-1.5">
                          {row._isValid ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                              <FiCheckCircle className="w-3 h-3" /> Ready
                            </span>
                          ) : (
                            <span
                              title={Object.values(row._errors || {}).join(' | ')}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-bold"
                            >
                              <FiAlertTriangle className="w-3 h-3" /> Fix ({Object.keys(row._errors || {}).length})
                            </span>
                          )}
                        </td>

                        <td className="px-2.5 py-1.5">
                          {row._resolvedCluster ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-bold">
                                {row._resolvedCluster.cluster_name}
                                {row._resolvedCluster.cluster_code ? ` (${row._resolvedCluster.cluster_code})` : ''}
                              </span>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                {row._resolvedCluster.state_name}
                              </div>
                            </div>
                          ) : (row.state_name || row.state) ? (
                            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                              {row.state_name || row.state} (No Cluster Match)
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">—</span>
                          )}
                        </td>

                        {activeFieldList.map((f) => {
                          const errMsg = row._errors?.[f.key];
                          return (
                            <td key={f.key} className="px-2 py-1.5">
                              <input
                                type="text"
                                value={row[f.key] ?? ''}
                                onChange={(e) => handleInlineCellEdit(row._rowIndex, f.key, e.target.value)}
                                placeholder={f.required ? 'Required' : '—'}
                                className={`w-full px-2 py-1 rounded-lg border text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 ${
                                  errMsg
                                    ? 'border-rose-400 ring-rose-300 focus:ring-rose-500'
                                    : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500'
                                }`}
                              />
                              {errMsg && (
                                <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5 leading-tight">{errMsg}</p>
                              )}
                            </td>
                          );
                        })}

                        {customMappedColumns.length > 0 && (
                          <td className="px-2.5 py-1.5 text-[10px] text-slate-600 dark:text-slate-300">
                            {Object.entries(row._customFields || {})
                              .filter(([, v]) => String(v || '').trim() !== '')
                              .slice(0, 3)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(' • ') || '—'}
                          </td>
                        )}

                        <td className="px-2 py-1.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemovePreviewRow(row._rowIndex)}
                            className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                            title="Remove row"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* UPLOAD RESULT & OPTION B DUPLICATE / CONFLICT BREAKDOWN */}
          {submitResult && (
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <FiCheckCircle className="w-4 h-4 shrink-0" />
                  {submitResult.message || 'Bulk upload completed successfully.'}
                </p>
              </div>

              {Array.isArray(submitResult.skippedDetails) && submitResult.skippedDetails.length > 0 && (
                <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900 p-3 space-y-2">
                  <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <FiAlertTriangle /> Option B Duplicate / Conflict Report — {submitResult.skippedDetails.length} record(s) skipped while valid leads uploaded cleanly:
                  </p>
                  <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] uppercase font-bold text-slate-500">
                        <tr>
                          <th className="px-2.5 py-1.5">Name</th>
                          <th className="px-2.5 py-1.5">Phone / Email</th>
                          <th className="px-2.5 py-1.5">Reason / Conflict</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {submitResult.skippedDetails.map((d, i) => (
                          <tr key={i}>
                            <td className="px-2.5 py-1.5 font-semibold text-slate-800 dark:text-slate-100">{d.name || 'Lead'}</td>
                            <td className="px-2.5 py-1.5 font-mono text-slate-600 dark:text-slate-300">
                              {[d.phone, d.email].filter(Boolean).join(' • ') || '—'}
                            </td>
                            <td className="px-2.5 py-1.5 text-amber-700 dark:text-amber-300 font-semibold">{d.reason || d.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {previewRows.length === 0
              ? 'No file chosen yet. Download sample template above or drop your Excel / CSV file.'
              : errorRows.length > 0
              ? `${validRows.length} ready to import • ${errorRows.length} row(s) need inline fix (only ready rows will import)`
              : `All ${validRows.length} row(s) validated cleanly and ready for import`}
          </p>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
            >
              {submitResult ? 'Done / Close' : 'Cancel'}
            </button>

            <button
              type="button"
              disabled={submitting || validRows.length === 0}
              onClick={handleConfirmImport}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <FiUploadCloud className="w-4 h-4" />
              {submitting ? 'Importing...' : `${submitLabel} (${validRows.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
