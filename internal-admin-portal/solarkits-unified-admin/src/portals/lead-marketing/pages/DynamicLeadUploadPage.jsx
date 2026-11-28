import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  FaFileUpload,
  FaTable,
  FaCheckCircle,
  FaSave,
  FaTrash,
  FaHistory
} from 'react-icons/fa';
import { leadMarketingHttp, extractError, SEGMENT_LABELS } from '../services/leadMarketingApi';
import LeadMarketingBulkUploadModal from '../components/LeadMarketingBulkUploadModal';

const SYSTEM_FIELDS = [
  { key: '__ignore__', label: '-- Ignore Column --' },
  { key: '__custom__', label: '+ Save as Custom Field' },
  { key: 'company_name', label: 'Company Name *' },
  { key: 'contact_person', label: 'Contact Person' },
  { key: 'email', label: 'Email ID' },
  { key: 'country_code', label: 'Country Code' },
  { key: 'mobile_number', label: 'Mobile Number' },
  { key: 'country_name', label: 'Country' },
  { key: 'state_name', label: 'State' },
  { key: 'district_name', label: 'District / City' },
  { key: 'cluster_name', label: 'Solarkits Cluster' },
  { key: 'gst_number', label: 'GST Number' },
  { key: 'assigned_bde', label: 'Assigned BDE' },
  { key: 'lead_source', label: 'Lead Source' },
  { key: 'lead_status', label: 'Lead Status' },
  { key: 'remarks', label: 'Remarks' }
];

const HEADER_ALIAS_RULES = [
  { field: 'company_name', patterns: ['company', 'firm', 'business', 'organization', 'enterprise', 'epc'] },
  { field: 'contact_person', patterns: ['owner', 'contact', 'person', 'name', 'director'] },
  { field: 'email', patterns: ['email', 'mail', 'e-mail'] },
  { field: 'mobile_number', patterns: ['mobile', 'phone', 'whatsapp', 'cell', 'contact_no', 'number'] },
  { field: 'country_name', patterns: ['country'] },
  { field: 'state_name', patterns: ['state', 'province', 'region'] },
  { field: 'district_name', patterns: ['district', 'city', 'town'] },
  { field: 'cluster_name', patterns: ['cluster', 'zone'] },
  { field: 'gst_number', patterns: ['gst', 'gstin', 'tax'] },
  { field: 'assigned_bde', patterns: ['bde', 'sales', 'executive', 'representative', 'manager'] },
  { field: 'lead_source', patterns: ['source', 'channel', 'campaign', 'origin'] },
  { field: 'lead_status', patterns: ['status', 'stage'] },
  { field: 'remarks', patterns: ['remark', 'note', 'comment'] }
];

const autoSuggestField = (header) => {
  const clean = String(header || '').toLowerCase().trim();
  for (const rule of HEADER_ALIAS_RULES) {
    if (rule.patterns.some((p) => clean.includes(p))) return rule.field;
  }
  return '__ignore__';
};

export default function DynamicLeadUploadPage() {
  const [meta, setMeta] = useState({ primary_segments: [], subgroups: [], settings: { lead_sources: [], lead_statuses: [] }, states: [], bdes: [], countries: [] });
  const [histories, setHistories] = useState([]);
  const [savedTemplates, setSavedTemplates] = useState([]);

  // Workbook state
  const [fileName, setFileName] = useState('');
  const [workbook, setWorkbook] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheets, setSelectedSheets] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});

  // Import Config
  const [primarySegmentKey, setPrimarySegmentKey] = useState('franchisee_leads');
  const [subgroupIds, setSubgroupIds] = useState([]);
  const [duplicateRule, setDuplicateRule] = useState('skip');
  const [defaultSource, setDefaultSource] = useState('upload');
  const [defaultCountry, setDefaultCountry] = useState('India');
  const [defaultState, setDefaultState] = useState('');
  const [defaultBdeId, setDefaultBdeId] = useState('');
  const [templateNameInput, setTemplateNameInput] = useState('');

  // Row slice & Validation Preview
  const [rowStart, setRowStart] = useState(1);
  const [rowEnd, setRowEnd] = useState(0); // 0 = all rows
  const [previewData, setPreviewData] = useState(null);
  const [uploadReport, setUploadReport] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [showQuickBulkModal, setShowQuickBulkModal] = useState(false);

  const loadMetaAndHistory = async () => {
    try {
      const [mRes, hRes] = await Promise.all([
        leadMarketingHttp.get('/meta'),
        leadMarketingHttp.get('/imports/history')
      ]);
      if (mRes.data?.success) setMeta(mRes.data.data);
      if (hRes.data?.success) {
        setHistories(hRes.data.data.histories || []);
        setSavedTemplates(hRes.data.data.mappings || []);
      }
    } catch {
      // non-fatal
    }
  };

  useEffect(() => {
    loadMetaAndHistory();
  }, []);

  const handleFilePick = async (file) => {
    if (!file) return;
    setError(null);
    setPreviewData(null);
    setUploadReport(null);
    setFileName(file.name);
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    setWorkbook(wb);
    setSheetNames(wb.SheetNames || []);
    setSelectedSheets(wb.SheetNames?.length ? [wb.SheetNames[0]] : []);
  };

  // Combine rows across all checked workbook sheets & apply optional row range
  const rawCombinedRows = useMemo(() => {
    if (!workbook || selectedSheets.length === 0) return [];
    const list = [];
    for (const sName of selectedSheets) {
      const ws = workbook.Sheets[sName];
      if (!ws) continue;
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      for (const r of rows) {
        list.push({ ...r, __sheet: sName });
      }
    }
    const startIdx = Math.max(0, Number(rowStart || 1) - 1);
    const endIdx = rowEnd > 0 ? Number(rowEnd) : list.length;
    return list.slice(startIdx, endIdx);
  }, [workbook, selectedSheets, rowStart, rowEnd]);

  const detectedColumns = useMemo(() => {
    const colSet = new Set();
    rawCombinedRows.slice(0, 20).forEach((r) => {
      Object.keys(r).filter((k) => k !== '__sheet').forEach((k) => colSet.add(k));
    });
    return Array.from(colSet);
  }, [rawCombinedRows]);

  // Auto-suggest mapping when columns change
  useEffect(() => {
    if (detectedColumns.length === 0) return;
    setColumnMapping((prev) => {
      const next = {};
      for (const col of detectedColumns) {
        next[col] = prev[col] || autoSuggestField(col);
      }
      return next;
    });
  }, [detectedColumns]);

  const buildMappedRows = () =>
    rawCombinedRows.map((raw) => {
      const mapped = { __sheet: raw.__sheet, custom_fields: {} };
      for (const [col, target] of Object.entries(columnMapping)) {
        const val = raw[col];
        if (!target || target === '__ignore__') continue;
        if (target === '__custom__') {
          mapped.custom_fields[col] = val;
        } else {
          mapped[target] = val;
        }
      }
      return mapped;
    });

  const handlePreviewValidation = async () => {
    setBusy(true);
    setError(null);
    setUploadReport(null);
    try {
      const mapped = buildMappedRows();
      const res = await leadMarketingHttp.post('/imports/preview', {
        rows: mapped,
        primary_segment_key: primarySegmentKey
      });
      if (res.data?.success) setPreviewData(res.data.data);
    } catch (err) {
      setError(extractError(err, 'Preview validation failed'));
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmImport = async () => {
    setBusy(true);
    setError(null);
    try {
      const mapped = buildMappedRows();
      const res = await leadMarketingHttp.post('/imports/execute', {
        rows: mapped,
        file_name: fileName,
        sheet_names: selectedSheets,
        primary_segment_key: primarySegmentKey,
        subgroup_ids: subgroupIds,
        lead_source: defaultSource,
        duplicate_rule: duplicateRule,
        column_mapping: columnMapping,
        default_country: defaultCountry,
        default_state: defaultState,
        default_bde_id: defaultBdeId
      });
      if (res.data?.success) {
        setUploadReport(res.data.data);
        setPreviewData(null);
        await loadMetaAndHistory();
      }
    } catch (err) {
      setError(extractError(err, 'Import failed'));
    } finally {
      setBusy(false);
    }
  };

  const handleSaveMappingTemplate = async () => {
    if (!templateNameInput.trim()) return;
    await leadMarketingHttp.post('/imports/mappings', {
      template_name: templateNameInput.trim(),
      primary_segment_key: primarySegmentKey,
      column_mapping: columnMapping,
      duplicate_rule: duplicateRule
    });
    setTemplateNameInput('');
    await loadMetaAndHistory();
  };

  const segmentSubgroups = (meta.subgroups || []).filter((sg) => sg.primary_segment_key === primarySegmentKey);

  return (
    <div className="space-y-6 pb-16">
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FaFileUpload className="text-teal-600" /> Dynamic Multi-Sheet Excel / CSV Lead Upload
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload any workbook structure without fixed templates. Choose sheets, select rows, dynamically map columns &amp; custom fields, detect duplicates across sheets, and retain complete source history.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowQuickBulkModal(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
        >
          <FaFileUpload /> Dynamic Field Bulk Upload (BDE-Style)
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">{error}</div>
      )}

      {/* Step 1: Primary Segment, Sub-groups & Upload Workbook */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4 text-xs">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="font-bold block mb-1">1. Primary Segment (Mandatory) *</label>
            <select
              value={primarySegmentKey}
              onChange={(e) => { setPrimarySegmentKey(e.target.value); setSubgroupIds([]); }}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold"
            >
              {(meta.primary_segments || []).map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="font-bold block mb-1">2. Lead Source Default</label>
            <select value={defaultSource} onChange={(e) => setDefaultSource(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
              {(meta.settings?.lead_sources || []).map((ls) => <option key={ls.key} value={ls.key}>{ls.label}</option>)}
            </select>
          </div>
          <div>
            <label className="font-bold block mb-1">3. Default Country / State</label>
            <div className="flex gap-1.5">
              <input value={defaultCountry} onChange={(e) => setDefaultCountry(e.target.value)} className="w-24 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900" placeholder="Country" />
              <select value={defaultState} onChange={(e) => setDefaultState(e.target.value)} className="flex-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                <option value="">State from sheet</option>
                {(meta.states || []).map((s) => <option key={s._id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="font-bold block mb-1">4. Default BDE Owner</label>
            <select value={defaultBdeId} onChange={(e) => setDefaultBdeId(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
              <option value="">BDE from sheet / None</option>
              {(meta.bdes || []).map((b) => <option key={b._id} value={b._id}>{b.full_name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="font-bold block mb-1.5">Sub-Groups to Apply ({SEGMENT_LABELS[primarySegmentKey]})</label>
          <div className="flex flex-wrap gap-1.5">
            {segmentSubgroups.map((sg) => {
              const active = subgroupIds.includes(sg._id);
              return (
                <button
                  key={sg._id}
                  type="button"
                  onClick={() => setSubgroupIds((p) => active ? p.filter((x) => x !== sg._id) : [...p, sg._id])}
                  className={`px-2.5 py-1 rounded-lg border font-semibold cursor-pointer ${active ? 'bg-teal-600 text-white border-teal-600' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'}`}
                >
                  {sg.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* File Dropzone */}
        <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-6 text-center space-y-2 bg-slate-50/50 dark:bg-slate-900/30">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            id="lead-workbook-input"
            className="hidden"
            onChange={(e) => handleFilePick(e.target.files?.[0])}
          />
          <label htmlFor="lead-workbook-input" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer">
            <FaFileUpload /> {fileName ? `Loaded: ${fileName}` : 'Choose Excel (.xlsx / .xls) or CSV Workbook'}
          </label>
          <p className="text-[11px] text-slate-500">
            Supports multi-sheet Excel workbooks, dynamic header renaming, custom fields &amp; cross-sheet deduplication.
          </p>
        </div>

        {/* Multi-Sheet Selector + Row Range + Duplicate Handling */}
        {sheetNames.length > 0 && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-bold block">Workbook Sheets Detected ({sheetNames.length}):</span>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {sheetNames.map((sn) => {
                    const checked = selectedSheets.includes(sn);
                    return (
                      <label key={sn} className={`px-2.5 py-1 rounded-lg border cursor-pointer flex items-center gap-1.5 font-semibold ${checked ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200' : 'border-slate-200'}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => setSelectedSheets((p) => e.target.checked ? [...p, sn] : p.filter((x) => x !== sn))}
                        />
                        <span>{sn}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div>
                  <label className="text-[10px] font-bold block">Row From</label>
                  <input type="number" min={1} value={rowStart} onChange={(e) => setRowStart(e.target.value)} className="w-20 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
                </div>
                <div>
                  <label className="text-[10px] font-bold block">To (0 = All)</label>
                  <input type="number" min={0} value={rowEnd} onChange={(e) => setRowEnd(e.target.value)} className="w-24 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
                </div>
                <div>
                  <label className="text-[10px] font-bold block">Duplicate Rule</label>
                  <select value={duplicateRule} onChange={(e) => setDuplicateRule(e.target.value)} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold">
                    <option value="skip">Skip Duplicates (Keep Source History)</option>
                    <option value="update">Update Existing Records &amp; Merge Tags</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Dynamic Field Mapping + Saved Templates */}
      {detectedColumns.length > 0 && (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-extrabold flex items-center gap-2">
              <FaTable className="text-indigo-600" /> Dynamic Field Mapping ({rawCombinedRows.length} rows ready)
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              {savedTemplates.length > 0 && (
                <select
                  onChange={(e) => {
                    const tpl = savedTemplates.find((t) => t._id === e.target.value);
                    if (tpl?.column_mapping) {
                      setColumnMapping((prev) => ({ ...prev, ...tpl.column_mapping }));
                      if (tpl.duplicate_rule) setDuplicateRule(tpl.duplicate_rule);
                    }
                  }}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                >
                  <option value="">-- Load Saved Mapping Template --</option>
                  {savedTemplates.map((t) => <option key={t._id} value={t._id}>{t.template_name}</option>)}
                </select>
              )}
              <input
                value={templateNameInput}
                onChange={(e) => setTemplateNameInput(e.target.value)}
                placeholder="Save mapping name..."
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
              />
              <button type="button" onClick={handleSaveMappingTemplate} className="px-3 py-2 rounded-xl bg-slate-800 text-white font-bold flex items-center gap-1 cursor-pointer">
                <FaSave /> Save Template
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {detectedColumns.map((col) => (
              <div key={col} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 dark:text-white truncate">{col}</div>
                  <div className="text-[10px] text-slate-400 truncate">e.g. {String(rawCombinedRows[0]?.[col] ?? '')}</div>
                </div>
                <select
                  value={columnMapping[col] || '__ignore__'}
                  onChange={(e) => setColumnMapping((p) => ({ ...p, [col]: e.target.value }))}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold max-w-[170px]"
                >
                  {SYSTEM_FIELDS.map((sf) => <option key={sf.key} value={sf.key}>{sf.label}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handlePreviewValidation}
              disabled={busy}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
            >
              {busy ? 'Validating...' : 'Preview & Check Duplicates'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Validation Preview */}
      {previewData && (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 font-bold">Total: {previewData.summary.total_rows}</span>
              <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold">New Valid: {previewData.summary.valid_new}</span>
              <span className="px-3 py-1 rounded-lg bg-amber-50 text-amber-700 font-bold">DB Duplicates: {previewData.summary.duplicates_in_db}</span>
              <span className="px-3 py-1 rounded-lg bg-rose-50 text-rose-700 font-bold">Invalid Rows: {previewData.summary.invalid_rows}</span>
            </div>
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={busy}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
            >
              {busy ? 'Importing...' : `Confirm & Import (${duplicateRule === 'update' ? 'Update Duplicates' : 'Skip Duplicates'})`}
            </button>
          </div>

          <div className="overflow-x-auto max-h-72 border border-slate-200 dark:border-slate-700 rounded-xl">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] uppercase sticky top-0">
                <tr>
                  <th className="py-2 px-3">#</th>
                  <th className="py-2 px-3">Validation Status</th>
                  <th className="py-2 px-3">Company</th>
                  <th className="py-2 px-3">Email</th>
                  <th className="py-2 px-3">Mobile</th>
                  <th className="py-2 px-3">Notes / Duplicate Match</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {previewData.preview_rows.map((r) => (
                  <tr key={r.row_index}>
                    <td className="py-1.5 px-3">{r.row_index}</td>
                    <td className="py-1.5 px-3 font-bold">
                      {r.status === 'valid_new' && <span className="text-emerald-600">Valid New</span>}
                      {r.status === 'duplicate_db' && <span className="text-amber-600">Duplicate in DB</span>}
                      {r.status === 'duplicate_file' && <span className="text-amber-500">Duplicate in Sheet</span>}
                      {r.status === 'invalid' && <span className="text-rose-600">Invalid</span>}
                    </td>
                    <td className="py-1.5 px-3 font-semibold">{r.company_name}</td>
                    <td className="py-1.5 px-3 font-mono">{r.email}</td>
                    <td className="py-1.5 px-3 font-mono">{r.mobile_number}</td>
                    <td className="py-1.5 px-3 text-[11px] text-slate-500">
                      {r.errors.join(', ') || (r.duplicate_match ? `Matched ${r.duplicate_match.matched_on} with ${r.duplicate_match.lead_id} (${r.duplicate_match.company_name})` : 'Ready')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Report */}
      {uploadReport && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-2 text-xs">
          <div className="font-black text-emerald-800 dark:text-emerald-200 flex items-center gap-2 text-sm">
            <FaCheckCircle /> Import Batch {uploadReport.batch_id} Completed
          </div>
          <div className="flex flex-wrap gap-3 font-bold">
            <span>Inserted New: {uploadReport.inserted_count}</span>
            <span>Updated Existing: {uploadReport.updated_count}</span>
            <span>Duplicates Skipped: {uploadReport.duplicates_skipped}</span>
            <span>Invalid Rows: {uploadReport.invalid_count}</span>
          </div>
        </div>
      )}

      {/* Import History */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
        <h3 className="text-sm font-extrabold flex items-center gap-2"><FaHistory className="text-slate-500" /> Upload &amp; Import History Log</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-[10px] uppercase text-slate-500">
              <tr>
                <th className="py-2 px-3">Batch ID</th>
                <th className="py-2 px-3">File / Sheets</th>
                <th className="py-2 px-3">Primary Segment</th>
                <th className="py-2 px-3">Inserted / Updated / Skipped</th>
                <th className="py-2 px-3">Uploaded By</th>
                <th className="py-2 px-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {histories.map((h) => (
                <tr key={h._id}>
                  <td className="py-2 px-3 font-mono font-bold">{h.batch_id}</td>
                  <td className="py-2 px-3">
                    <div className="font-bold">{h.file_name}</div>
                    <div className="text-[10px] text-slate-500">{(h.sheet_names || []).join(', ')}</div>
                  </td>
                  <td className="py-2 px-3">{SEGMENT_LABELS[h.primary_segment_key]}</td>
                  <td className="py-2 px-3 font-semibold">{h.inserted_count} / {h.updated_count} / {h.duplicates_skipped} (Inv: {h.invalid_count})</td>
                  <td className="py-2 px-3">{h.uploaded_by_name}</td>
                  <td className="py-2 px-3 text-slate-500">{new Date(h.imported_at).toLocaleString('en-IN')}</td>
                </tr>
              ))}
              {histories.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-slate-400">No uploads logged yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {savedTemplates.length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-2">
            <span className="font-bold text-slate-500">Saved Mapping Templates:</span>
            {savedTemplates.map((t) => (
              <span key={t._id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700">
                <span>{t.template_name}</span>
                <button
                  type="button"
                  onClick={async () => {
                    await leadMarketingHttp.delete(`/imports/mappings/${t._id}`);
                    loadMetaAndHistory();
                  }}
                  className="text-rose-500 cursor-pointer"
                >
                  <FaTrash className="text-[10px]" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <LeadMarketingBulkUploadModal
        isOpen={showQuickBulkModal}
        onClose={() => setShowQuickBulkModal(false)}
        meta={meta}
        defaultSegmentKey={primarySegmentKey}
        onImportSuccess={(res) => {
          if (res?.data) setUploadReport(res.data);
          loadMetaAndHistory();
        }}
      />
    </div>
  );
}
