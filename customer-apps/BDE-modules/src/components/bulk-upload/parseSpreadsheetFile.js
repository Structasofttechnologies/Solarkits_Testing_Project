import * as XLSX from 'xlsx';

/**
 * Generates an Express/mongoSanitize-safe dot-free canonical field key.
 */
export const slugifyHeaderKey = (text, idx = 0) => {
  const clean = String(text || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return clean || `field_${idx + 1}`;
};

/**
 * Normalizes strings for matching file headers against canonical DB fields / aliases.
 */
const normalizeToken = (val) =>
  String(val || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const tokenizeWords = (val) =>
  String(val || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1 && !['the', 'and', 'for', 'your', 'please', 'enter', 'select', 'of', 'in', 'to'].includes(w));

const diceCoefficient = (a, b) => {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const bigramsA = new Map();
  for (let i = 0; i < a.length - 1; i++) {
    const bg = a.slice(i, i + 2);
    bigramsA.set(bg, (bigramsA.get(bg) || 0) + 1);
  }
  let matches = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const bg = b.slice(i, i + 2);
    const count = bigramsA.get(bg) || 0;
    if (count > 0) {
      bigramsA.set(bg, count - 1);
      matches++;
    }
  }
  return (2 * matches) / (a.length + b.length - 2);
};

/**
 * Decodes UTF-16LE / UTF-16BE / UTF-8 ArrayBuffer cleanly (supports Meta Lead Ads UTF-16 exports).
 */
export const decodeCsvArrayBuffer = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let encoding = 'utf-8';

  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    encoding = 'utf-16le';
  } else if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    encoding = 'utf-16be';
  } else if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    encoding = 'utf-8';
  } else {
    const sampleLen = Math.min(bytes.length, 256);
    let evenNulls = 0;
    let oddNulls = 0;
    for (let i = 0; i < sampleLen; i++) {
      if (bytes[i] === 0) {
        if (i % 2 === 0) evenNulls += 1;
        else oddNulls += 1;
      }
    }
    if (oddNulls > 4 && evenNulls < oddNulls / 2) encoding = 'utf-16le';
    else if (evenNulls > 4 && oddNulls < evenNulls / 2) encoding = 'utf-16be';
  }

  const decoded = new TextDecoder(encoding).decode(bytes);
  return decoded.replace(/^\uFEFF/, '').replace(/\u0000/g, '');
};

export const detectCsvDelimiter = (text) => {
  let inQuotes = false;
  let firstLine = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') inQuotes = !inQuotes;
    if (!inQuotes && (ch === '\n' || ch === '\r')) {
      if (firstLine.trim()) break;
      continue;
    }
    firstLine += ch;
  }

  const counts = { '\t': 0, ',': 0, ';': 0, '|': 0 };
  inQuotes = false;
  for (let i = 0; i < firstLine.length; i++) {
    const ch = firstLine[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && Object.prototype.hasOwnProperty.call(counts, ch)) {
      counts[ch] += 1;
    }
  }

  let bestDelimiter = ',';
  let maxCount = 0;
  for (const [delim, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      bestDelimiter = delim;
    }
  }
  return bestDelimiter;
};

/**
 * Quote-aware RFC-4180 CSV/TSV parser supporting embedded newlines and escaped quotes.
 */
export const parseCsvText = (rawText) => {
  const text = String(rawText || '').replace(/^\uFEFF/, '').replace(/\u0000/g, '');
  const delimiter = detectCsvDelimiter(text);
  const rows = [];
  let row = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(current.trim());
      current = '';
    } else if (ch === '\r' && next === '\n') {
      row.push(current.trim());
      if (row.some((cell) => cell !== '')) rows.push(row);
      row = [];
      current = '';
      i++;
    } else if (ch === '\n' || ch === '\r') {
      row.push(current.trim());
      if (row.some((cell) => cell !== '')) rows.push(row);
      row = [];
      current = '';
    } else {
      current += ch;
    }
  }

  if (current !== '' || row.length > 0) {
    row.push(current.trim());
    if (row.some((cell) => cell !== '')) rows.push(row);
  }

  if (rows.length < 2) {
    return { headers: (rows[0] || []).map((h, i) => h || `Column_${i + 1}`), records: [], delimiter };
  }

  const headers = rows[0].map((h, i) => (h && String(h).trim()) || `Column_${i + 1}`);
  const records = rows.slice(1).map((values) => {
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = values[idx] !== undefined ? String(values[idx]).trim() : '';
    });
    return obj;
  });

  return { headers, records, delimiter };
};

const formatSpreadsheetCell = (val) => {
  if (val === null || val === undefined) return '';
  if (val instanceof Date) {
    return Number.isNaN(val.getTime()) ? '' : val.toISOString().split('T')[0];
  }
  return String(val).trim();
};

/**
 * Unified spreadsheet parser (.xlsx via read-excel-file + UTF-16/UTF-8 .csv/.tsv/.txt).
 */
export const parseSpreadsheetFile = async (file) => {
  if (!file) throw new Error('No file provided');
  const fileName = String(file.name || 'upload.csv');
  const lower = fileName.toLowerCase();

  if (lower.endsWith('.xls')) {
    throw new Error('Legacy .xls (97-2003) binary files are not supported directly. Please save as .xlsx or .csv and re-upload.');
  }

  if (lower.endsWith('.xlsx') || file.type?.includes('spreadsheetml')) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
    const nonEmptyRows = (rawRows || []).filter((r) => Array.isArray(r) && r.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== ''));
    if (nonEmptyRows.length === 0) {
      return { headers: [], records: [], fileName, format: 'xlsx' };
    }
    const headers = nonEmptyRows[0].map((h, idx) => formatSpreadsheetCell(h) || `Column_${idx + 1}`);
    const records = nonEmptyRows.slice(1).map((values) => {
      const obj = {};
      headers.forEach((header, idx) => {
        obj[header] = formatSpreadsheetCell(values[idx]);
      });
      return obj;
    });
    return { headers, records, fileName, format: 'xlsx' };
  }

  const buffer = await file.arrayBuffer();
  const decoded = decodeCsvArrayBuffer(buffer);
  const { headers, records } = parseCsvText(decoded);
  return { headers, records, fileName, format: 'csv' };
};

/**
 * Rich built-in alias lexicon so ANY renamed file column or renamed DB column maps seamlessly.
 */
const GLOBAL_CANONICAL_ALIASES = {
  company_name: ['company', 'companyname', 'firm', 'firmname', 'epc', 'epcname', 'business', 'businessname', 'organization', 'organisation', 'org', 'agency', 'enterprise', 'contractor', 'partner', 'partnername', 'party', 'partyname', 'vendor', 'dealer'],
  name: ['name', 'companyname', 'company', 'firmname', 'epcname', 'fullname', 'businessname', 'leadname', 'partyname', 'partnername'],
  contact_person: ['contactperson', 'contactname', 'fullname', 'owner', 'ownername', 'proprietor', 'director', 'person', 'personname', 'clientname', 'customername', 'leadname', 'representative', 'poc'],
  mobile_number: ['mobilenumber', 'mobile', 'mobileno', 'mob', 'phone', 'phonenumber', 'phoneno', 'contactno', 'contactnumber', 'tel', 'telephone', 'cell', 'cellno', 'callno', 'ph', 'phno', 'whatsapp', 'whatsappnumber', 'whatsappno'],
  phone: ['phone', 'phonenumber', 'phoneno', 'mobile', 'mobilenumber', 'mobileno', 'mob', 'contactno', 'contactnumber', 'tel', 'cell', 'ph'],
  whatsapp_number: ['whatsapp', 'whatsappnumber', 'whatsappno', 'wa', 'wanumber', 'wano'],
  email: ['email', 'emailid', 'emailaddress', 'mail', 'mailid', 'officialemail', 'workemail', 'businessemail'],
  gst_number: ['gst', 'gstin', 'gstno', 'gstnumber', 'gstinnumber', 'taxid', 'gsttaxid'],
  state_name: ['state', 'statename', 'province', 'pradesh', 'ut', 'stateut', 'region', 'locationstate'],
  state: ['state', 'statename', 'province', 'pradesh', 'ut', 'stateut', 'region'],
  district_name: ['district', 'districtname', 'dist', 'city', 'taluka', 'tehsil', 'town', 'zilla', 'area', 'location', 'citydistrict', 'districtcity'],
  district: ['district', 'districtname', 'dist', 'city', 'taluka', 'tehsil', 'town', 'zilla', 'area'],
  cluster_name: ['cluster', 'clustername', 'clustercode', 'clusterarea', 'territory', 'territorycluster', 'zone'],
  cluster: ['cluster', 'clustername', 'clustercode', 'clusterarea', 'territory', 'zone'],
  pincode: ['pincode', 'pin', 'zipcode', 'zip', 'postalcode', 'postal', 'postcode'],
  address_line: ['address', 'addressline', 'fulladdress', 'street', 'shopaddress', 'officeaddress', 'premises', 'landmark'],
  epc_type: ['epctype', 'type', 'classification', 'classificationtype', 'category', 'tier', 'segmenttype'],
  lead_source: ['leadsource', 'source', 'platform', 'channel', 'campaign', 'campaignname', 'adname', 'formname', 'origin'],
  source: ['source', 'leadsource', 'platform', 'channel'],
  interested_products: ['interestedproducts', 'products', 'product', 'interestedin', 'kits', 'kit', 'solarrequirement', 'requirement', 'kw', 'capacity'],
  lifetime_orders: ['lifetimeorders', 'orders', 'ordercount', 'pastorders', 'pastpurchases', 'totalkits', 'kitsordered', 'qty'],
  follow_up_date: ['followupdate', 'followup', 'nextcall', 'nextcalldate', 'callback', 'callbackdate', 'scheduledate'],
  remarks: ['remarks', 'remark', 'notes', 'note', 'comment', 'comments', 'description', 'query', 'message', 'querymessage'],
};

const scoreHeaderMatch = (rawHeader, field) => {
  const normHeader = normalizeToken(rawHeader);
  if (!normHeader) return { score: 0, via: null };

  const normKey = normalizeToken(field.key);
  const normLabel = normalizeToken(field.label);

  if (normHeader === normKey || normHeader === normLabel) {
    return { score: 1.0, via: normHeader === normKey ? 'exact_key' : 'exact_label' };
  }

  const candidateAliases = Array.from(
    new Set([
      ...(field.aliases || []),
      ...(GLOBAL_CANONICAL_ALIASES[field.key] || []),
    ])
  ).map(normalizeToken).filter(Boolean);

  if (candidateAliases.includes(normHeader)) {
    return { score: 0.94, via: 'auto_alias' };
  }

  const headerWords = tokenizeWords(rawHeader);

  // Do not fuzzy-map survey questions or long sentences into core DB identity columns
  const looksLikeSurveyQuestion =
    String(rawHeader || '').includes('?') ||
    headerWords.length >= 5 ||
    /^(are|is|do|does|did|would|will|can|could|how|which|what|when|where|why)[_\s]+/i.test(String(rawHeader || '').trim().replace(/^_+/, ''));

  if (looksLikeSurveyQuestion) {
    return { score: 0, via: null };
  }

  const GENERIC_NON_EXCLUSIVE_WORDS = new Set(['epc', 'solar', 'kit', 'kits', 'lead', 'leads', 'number', 'num', 'name', 'info', 'date', 'type', 'id', 'status']);
  const fieldWords = new Set(
    [
      ...tokenizeWords(field.key),
      ...tokenizeWords(field.label),
      ...candidateAliases,
    ].filter((w) => !GENERIC_NON_EXCLUSIVE_WORDS.has(w))
  );

  let bestFuzzy = 0;
  for (const alias of [normKey, normLabel, ...candidateAliases]) {
    if (!alias || GENERIC_NON_EXCLUSIVE_WORDS.has(alias)) continue;
    if (normHeader.includes(alias) && alias.length >= 4 && alias.length / normHeader.length >= 0.4) {
      bestFuzzy = Math.max(bestFuzzy, 0.82 + Math.min(0.08, (alias.length / normHeader.length) * 0.08));
    } else if (alias.includes(normHeader) && normHeader.length >= 4 && normHeader.length / alias.length >= 0.5) {
      bestFuzzy = Math.max(bestFuzzy, 0.78);
    } else {
      const dice = diceCoefficient(normHeader, alias);
      if (dice >= 0.72) {
        bestFuzzy = Math.max(bestFuzzy, dice * 0.85);
      }
    }
  }

  for (const hw of headerWords) {
    if (hw.length >= 3 && fieldWords.has(hw)) {
      bestFuzzy = Math.max(bestFuzzy, 0.76);
    }
  }

  return bestFuzzy >= 0.65 ? { score: bestFuzzy, via: 'smart_rename' } : { score: 0, via: null };
};

/**
 * Automatically maps raw file columns -> canonical Database fields & renames/activates fields dynamically.
 */
export const autoMapFileHeaders = (
  rawHeaders = [],
  fieldOptions = [],
  records = [],
  { allowCustomColumns = false } = {}
) => {
  const cleanHeaders = (rawHeaders || []).map((h, i) => String(h || '').trim() || `Column_${i + 1}`);

  // Score all (headerIdx, fieldIdx) pairs so stronger matches win uniquely
  const pairs = [];
  cleanHeaders.forEach((rawHeader, hIdx) => {
    fieldOptions.forEach((field, fIdx) => {
      const { score, via } = scoreHeaderMatch(rawHeader, field);
      if (score > 0) {
        pairs.push({ rawHeader, hIdx, field, fIdx, score, via });
      }
    });
  });

  pairs.sort((a, b) => b.score - a.score || a.fIdx - b.fIdx || a.hIdx - b.hIdx);

  const claimedHeaders = new Map();
  const claimedFields = new Set();

  for (const pair of pairs) {
    if (claimedHeaders.has(pair.rawHeader) || claimedFields.has(pair.field.key)) continue;
    claimedHeaders.set(pair.rawHeader, {
      targetKey: pair.field.key,
      targetLabel: pair.field.label,
      matchedVia: pair.via,
      confidence: Number(pair.score.toFixed(2)),
      skip: false,
      isCustom: false,
    });
    claimedFields.add(pair.field.key);
  }

  const usedCustomKeys = new Set(fieldOptions.map((f) => slugifyHeaderKey(f.key)));

  const headerMappings = cleanHeaders.map((rawHeader, idx) => {
    const sampleVal = records.find((r) => String(r?.[rawHeader] || '').trim() !== '')?.[rawHeader] || '';
    const match = claimedHeaders.get(rawHeader);
    if (match) {
      return {
        rawHeader,
        sampleValue: String(sampleVal).slice(0, 60),
        ...match,
      };
    }

    let customKey = slugifyHeaderKey(rawHeader, idx);
    while (usedCustomKeys.has(customKey)) customKey = `${customKey}_${idx + 1}`;
    usedCustomKeys.add(customKey);

    return {
      rawHeader,
      sampleValue: String(sampleVal).slice(0, 60),
      targetKey: customKey,
      targetLabel: rawHeader,
      matchedVia: allowCustomColumns ? 'extra_custom' : 'unmapped',
      confidence: 0,
      skip: !allowCustomColumns,
      isCustom: allowCustomColumns,
    };
  });

  const autoActivatedKeys = Array.from(
    new Set(
      headerMappings
        .filter((m) => !m.skip && !m.isCustom && m.targetKey)
        .map((m) => m.targetKey)
    )
  );

  return { headerMappings, autoActivatedKeys };
};

const EMAIL_RX = /^[A-Za-z0-9._%+&-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const GST_RX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const CLIENT_NON_LATIN_STATES = {
  'à¤®à¤¹à¤¾à¤°à¤¾à¤·à¥à¤Ÿà¥à¤°': 'maharashtra',
  'à¤—à¥à¤œà¤°à¤¾à¤¤': 'gujarat',
  'à¤°à¤¾à¤œà¤¸à¥à¤¥à¤¾à¤¨': 'rajasthan',
  'à¤‰à¤¤à¥à¤¤à¤°à¤ªà¥à¤°à¤¦à¥‡à¤¶': 'uttarpradesh',
  'à¤‰à¤¤à¥à¤¤à¤° à¤ªà¥à¤°à¤¦à¥‡à¤¶': 'uttarpradesh',
  'à¤®à¤§à¥à¤¯à¤ªà¥à¤°à¤¦à¥‡à¤¶': 'madhyapradesh',
  'à¤®à¤§à¥à¤¯ à¤ªà¥à¤°à¤¦à¥‡à¤¶': 'madhyapradesh',
  'à¤•à¤°à¥à¤¨à¤¾à¤Ÿà¤•': 'karnataka',
  'à¤¤à¤®à¤¿à¤²à¤¨à¤¾à¤¡à¥': 'tamilnadu',
  'à¤¦à¤¿à¤²à¥à¤²à¥€': 'delhi',
};

const CLIENT_STATE_ALIASES = {
  mh: 'maharashtra', mah: 'maharashtra', maharastra: 'maharashtra',
  gj: 'gujarat', guj: 'gujarat', gujrat: 'gujarat',
  rj: 'rajasthan', raj: 'rajasthan',
  ka: 'karnataka', kar: 'karnataka',
  up: 'uttarpradesh', mp: 'madhyapradesh', tn: 'tamilnadu',
  dl: 'delhi', nctofdelhi: 'delhi', newdelhi: 'delhi',
  wb: 'westbengal', tg: 'telangana', ts: 'telangana',
  ap: 'andhrapradesh', pb: 'punjab', hr: 'haryana',
  kl: 'kerala', or: 'odisha', od: 'odisha', orissa: 'odisha',
  br: 'bihar', jh: 'jharkhand', cg: 'chhattisgarh',
  as: 'assam', uk: 'uttarakhand', hp: 'himachalpradesh', ga: 'goa',
};

const CLIENT_DISTRICT_ALIASES = {
  ahmadabad: 'ahmedabad', baroda: 'vadodara', broach: 'bharuch',
  poonah: 'pune', poona: 'pune', pimprichinchwad: 'pune', pimpri: 'pune', baramati: 'pune',
  aurangabad: 'chhatrapatisambhajinagar', osmanabad: 'dharashiv',
  ahilyanagar: 'ahmednagar', shirdi: 'ahmednagar',
  chikhli: 'buldhana', khamgaon: 'buldhana', kannad: 'chhatrapatisambhajinagar', mul: 'chandrapur',
  lko: 'lucknow', blr: 'bengaluruurban', bangalore: 'bengaluruurban',
  bom: 'mumbai', bombay: 'mumbai', navimumbai: 'thane', kalyan: 'thane',
  gurgaon: 'gurugram', noida: 'gautambuddhanagar',
  pnq: 'pune', ngp: 'nagpur', nsk: 'nashik', amd: 'ahmedabad',
};

const cleanClientStateToken = (val) => {
  const trimmed = String(val || '').trim();
  if (!trimmed) return '';
  const compact = trimmed.replace(/\s+/g, '');
  if (CLIENT_NON_LATIN_STATES[trimmed]) return CLIENT_NON_LATIN_STATES[trimmed];
  if (CLIENT_NON_LATIN_STATES[compact]) return CLIENT_NON_LATIN_STATES[compact];
  const base = trimmed.toLowerCase().replace(/\b(state|province|ut)\b/g, ' ').replace(/[^a-z0-9]/g, '');
  return CLIENT_STATE_ALIASES[base] || base;
};

const cleanClientDistrictToken = (val) => {
  const base = String(val || '')
    .toLowerCase()
    .replace(/bhoomi/g, 'bhumi')
    .replace(/\b(district|dist|region|division|cluster|urban|rural|city|taluka|tehsil|state)\b/g, ' ')
    .replace(/[^a-z0-9]/g, '');
  return CLIENT_DISTRICT_ALIASES[base] || base;
};

const extractClientDistrictTokens = (val) => {
  const raw = String(val || '').trim();
  if (!raw) return [];
  const parts = raw.split(/[,/|;\-]+/).map((p) => p.trim()).filter(Boolean);
  const ordered = parts.length > 1 ? [...parts.slice().reverse(), raw] : [raw];
  const seen = new Set();
  const out = [];
  for (const item of ordered) {
    const tok = cleanClientDistrictToken(item);
    if (tok && !seen.has(tok)) {
      seen.add(tok);
      out.push(tok);
    }
  }
  return out;
};

/**
 * Builds a fast client-side cluster & state resolver from live FranchiseeCluster records.
 */
export const buildClientClusterResolver = (clusters = []) => {
  const byCode = new Map();
  const byStateAndName = new Map();
  const byStateAndDistrict = new Map();
  const byGlobalDistrict = new Map();

  for (const clu of clusters || []) {
    if (!clu) continue;
    const stTok = cleanClientStateToken(clu.state_name);
    if (clu.cluster_code) byCode.set(String(clu.cluster_code).trim().toUpperCase(), clu);
    if (clu.cluster_name && stTok) {
      byStateAndName.set(`${stTok}::${cleanClientDistrictToken(clu.cluster_name)}`, clu);
    }
    for (const dName of clu.district_names || []) {
      const dTok = cleanClientDistrictToken(dName);
      if (!dTok) continue;
      if (stTok) byStateAndDistrict.set(`${stTok}::${dTok}`, clu);
      if (!byGlobalDistrict.has(dTok)) byGlobalDistrict.set(dTok, []);
      byGlobalDistrict.get(dTok).push(clu);
    }
  }

  return ({ stateName = '', districtName = '', clusterName = '' } = {}) => {
    const stTok = cleanClientStateToken(stateName);
    const dTokens = extractClientDistrictTokens(districtName);
    const cluTok = cleanClientDistrictToken(clusterName);

    let matched = null;
    if (clusterName) {
      matched = byCode.get(String(clusterName).trim().toUpperCase()) || null;
      if (!matched && stTok && cluTok) {
        matched = byStateAndName.get(`${stTok}::${cluTok}`) || null;
      }
      if (!matched && cluTok) {
        matched = (clusters || []).find((c) => cleanClientDistrictToken(c.cluster_name) === cluTok) || null;
      }
    }

    if (!matched && stTok && dTokens.length > 0) {
      for (const dt of dTokens) {
        const hit = byStateAndDistrict.get(`${stTok}::${dt}`);
        if (hit) {
          matched = hit;
          break;
        }
      }
    }

    if (!matched && dTokens.length > 0) {
      for (const dt of dTokens) {
        const hits = byGlobalDistrict.get(dt) || [];
        if (hits.length > 0) {
          matched = (stTok && hits.find((c) => cleanClientStateToken(c.state_name) === stTok)) || hits[0];
          break;
        }
      }
    }

    if (!matched) return null;
    return {
      cluster_id: matched._id ? String(matched._id) : null,
      cluster_name: matched.cluster_name || '',
      cluster_code: matched.cluster_code || '',
      state_name: matched.state_name || '',
      state_id: matched.state_id ? String(matched.state_id) : null,
    };
  };
};

/**
 * Validates and transforms mapped rows using active fields + dynamic batch defaults + live cluster resolution.
 */
export const buildValidatedPreviewRows = ({
  records = [],
  headerMappings = [],
  activeFieldKeys = [],
  fieldOptions = [],
  batchDefaults = {},
  allowCustomColumns = false,
  clusterResolver = null,
}) => {
  const activeSet = new Set(activeFieldKeys);
  const fieldByKey = new Map(fieldOptions.map((f) => [f.key, f]));

  const applyClusterInference = (rowObj) => {
    if (typeof clusterResolver !== 'function') {
      rowObj._resolvedCluster = null;
      return;
    }
    const rawState = String(rowObj.state_name ?? rowObj.state ?? batchDefaults.default_state ?? '').trim();
    const rawDist = String(rowObj.district_name ?? rowObj.district ?? batchDefaults.default_district ?? '').trim();
    const rawClu = String(rowObj.cluster_name ?? rowObj.cluster ?? batchDefaults.default_cluster ?? '').trim();
    const resolved = (rawDist || rawClu)
      ? clusterResolver({ stateName: rawState, districtName: rawDist, clusterName: rawClu })
      : null;

    rowObj._resolvedCluster = resolved;
    if (resolved?.state_name) {
      if (fieldByKey.has('state_name') && !String(rowObj.state_name ?? '').trim()) {
        rowObj.state_name = resolved.state_name;
      }
      if (fieldByKey.has('state') && !String(rowObj.state ?? '').trim()) {
        rowObj.state = resolved.state_name;
      }
    }
    if (resolved?.cluster_name) {
      if (fieldByKey.has('cluster_name') && !String(rowObj.cluster_name ?? '').trim()) {
        rowObj.cluster_name = resolved.cluster_name;
      }
      if (fieldByKey.has('cluster') && !String(rowObj.cluster ?? '').trim()) {
        rowObj.cluster = resolved.cluster_name;
      }
    }
  };

  const rows = records.map((rawRow, idx) => {
    const mapped = {
      _rowIndex: idx + 1,
      _customFields: {},
      _errors: {},
    };

    // 1. Copy values from mapped file columns when active or manually assigned
    for (const m of headerMappings) {
      if (!m || m.skip) continue;
      const cellVal = rawRow?.[m.rawHeader];
      const strVal = cellVal === undefined || cellVal === null ? '' : String(cellVal).trim();

      if (m.isCustom) {
        if (allowCustomColumns && m.targetKey) {
          mapped._customFields[m.targetKey] = strVal;
        }
      } else if (m.targetKey && (activeSet.has(m.targetKey) || strVal !== '')) {
        if (!mapped[m.targetKey] && strVal !== '') {
          mapped[m.targetKey] = strVal;
        } else if (mapped[m.targetKey] === undefined) {
          mapped[m.targetKey] = strVal;
        }
      }
    }

    // 2. Apply dynamic batch defaults if empty or unticked
    for (const field of fieldOptions) {
      const key = field.key;
      let val = mapped[key] !== undefined ? String(mapped[key]).trim() : '';

      if (!activeSet.has(key) && field.defaultKey && batchDefaults[field.defaultKey]) {
        val = String(batchDefaults[field.defaultKey]).trim();
      } else if (!val && field.defaultKey && batchDefaults[field.defaultKey]) {
        val = String(batchDefaults[field.defaultKey]).trim();
      }

      // Clean normalization per known field semantics
      if (['mobile_number', 'phone', 'whatsapp_number'].includes(key) && val) {
        const digits = val.replace(/\D/g, '');
        if (digits.length >= 10) val = digits.slice(-10);
      } else if (key === 'email' && val) {
        val = val.replace(/^Email\s*:\s*/i, '').replace(/\[dot\]/gi, '.').replace(/\[at\]/gi, '@').toLowerCase().trim();
      } else if (['gst_number', 'gstin'].includes(key) && val) {
        val = val.toUpperCase().trim();
      } else if (key === 'pincode' && val) {
        val = val.replace(/\D/g, '').slice(0, 6);
      }

      mapped[key] = val;
    }

    // 2.5 Auto-resolve existing Franchisee Cluster & infer State from District + State
    applyClusterInference(mapped);

    // 3. Per-field validation
    for (const field of fieldOptions) {
      const key = field.key;
      const val = String(mapped[key] || '').trim();
      const shouldCheck = field.required || activeSet.has(key) || field.alwaysValidate;
      if (!shouldCheck) continue;

      if (typeof field.validate === 'function') {
        const err = field.validate(val, mapped, batchDefaults, field);
        if (err) mapped._errors[key] = err;
        continue;
      }

      if (field.required && !val) {
        mapped._errors[key] = `${field.label} is required`;
        continue;
      }

      if (!val) continue;

      if (['mobile_number', 'phone', 'whatsapp_number'].includes(key) && !/^[6-9]\d{9}$/.test(val) && val.length !== 10) {
        mapped._errors[key] = 'Must be a 10-digit mobile number';
      } else if (key === 'email' && !EMAIL_RX.test(val)) {
        mapped._errors[key] = 'Invalid email format';
      } else if (['gst_number', 'gstin'].includes(key) && val && !GST_RX.test(val)) {
        mapped._errors[key] = 'Invalid 15-char GSTIN format';
      } else if (key === 'pincode' && val && !/^\d{6}$/.test(val)) {
        mapped._errors[key] = 'Pincode must be 6 digits';
      }
    }

    mapped._isValid = Object.keys(mapped._errors).length === 0;
    return mapped;
  });

  return {
    rows,
    validCount: rows.filter((r) => r._isValid).length,
    errorCount: rows.filter((r) => !r._isValid).length,
    fieldByKey,
  };
};

/**
 * Re-validates a single edited row after inline correction in Step 3.
 */
export const revalidateSingleRow = (
  row,
  fieldOptions = [],
  activeFieldKeys = [],
  batchDefaults = {},
  clusterResolver = null
) => {
  const activeSet = new Set(activeFieldKeys);
  const next = { ...row, _errors: {} };

  if (typeof clusterResolver === 'function') {
    const rawState = String(next.state_name ?? next.state ?? batchDefaults.default_state ?? '').trim();
    const rawDist = String(next.district_name ?? next.district ?? batchDefaults.default_district ?? '').trim();
    const rawClu = String(next.cluster_name ?? next.cluster ?? batchDefaults.default_cluster ?? '').trim();
    const resolved = (rawDist || rawClu)
      ? clusterResolver({ stateName: rawState, districtName: rawDist, clusterName: rawClu })
      : null;
    next._resolvedCluster = resolved;
    if (resolved?.state_name) {
      if (Object.prototype.hasOwnProperty.call(next, 'state_name') && !String(next.state_name || '').trim()) {
        next.state_name = resolved.state_name;
      }
      if (Object.prototype.hasOwnProperty.call(next, 'state') && !String(next.state || '').trim()) {
        next.state = resolved.state_name;
      }
    }
  }

  for (const field of fieldOptions) {
    const key = field.key;
    let val = String(next[key] || '').trim();

    if (['mobile_number', 'phone', 'whatsapp_number'].includes(key) && val) {
      const digits = val.replace(/\D/g, '');
      if (digits.length >= 10) val = digits.slice(-10);
      next[key] = val;
    } else if (key === 'email' && val) {
      val = val.toLowerCase().trim();
      next[key] = val;
    } else if (['gst_number', 'gstin'].includes(key) && val) {
      val = val.toUpperCase().trim();
      next[key] = val;
    }

    if (typeof field.validate === 'function') {
      const err = field.validate(val, next, batchDefaults, field);
      if (err) next._errors[key] = err;
      continue;
    }

    if (field.required && !val) {
      next._errors[key] = `${field.label} is required`;
      continue;
    }
    if (!val || (!field.required && !activeSet.has(key) && !field.alwaysValidate)) continue;

    if (['mobile_number', 'phone', 'whatsapp_number'].includes(key) && val.length !== 10) {
      next._errors[key] = 'Must be a 10-digit mobile number';
    } else if (key === 'email' && !EMAIL_RX.test(val)) {
      next._errors[key] = 'Invalid email format';
    } else if (['gst_number', 'gstin'].includes(key) && !GST_RX.test(val)) {
      next._errors[key] = 'Invalid 15-char GSTIN format';
    } else if (key === 'pincode' && !/^\d{6}$/.test(val)) {
      next._errors[key] = 'Pincode must be 6 digits';
    }
  }

  next._isValid = Object.keys(next._errors).length === 0;
  return next;
};

/**
 * Downloads a clean UTF-8 BOM CSV template strictly containing Step 1 active fields.
 */
export const downloadDynamicSampleTemplate = ({
  fileName = 'dynamic_leads_template.csv',
  fieldOptions = [],
  activeFieldKeys = [],
  sampleRows = [],
}) => {
  const activeFields = fieldOptions.filter((f) => f.required || activeFieldKeys.includes(f.key));
  const headers = activeFields.map((f) => f.label);

  const escapeCsvCell = (val) => {
    const str = String(val ?? '');
    if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };

  const defaultSamples = sampleRows.length > 0
    ? sampleRows
    : [
        Object.fromEntries(activeFields.map((f) => [f.key, f.sample || ''])),
      ];

  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...defaultSamples.map((sRow) =>
      activeFields.map((f) => escapeCsvCell(sRow[f.key] ?? f.sample ?? '')).join(',')
    ),
  ];

  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName.endsWith('.csv') ? fileName : `${fileName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};


/**
 * Convenience wrapper for DynamicBulkUploadModal that calls autoMapFileHeaders
 * with a 3-arg signature: (rawHeaders, fieldOptions, activeFieldKeys).
 * Passes an empty records array and enables custom columns by default.
 */
export const autoMapSpreadsheetHeaders = (rawHeaders, fieldOptions, activeFieldKeys) => {
  // Filter fieldOptions to only the active ones when activeFieldKeys is provided
  const activeFields = activeFieldKeys
    ? fieldOptions.filter((f) => activeFieldKeys.includes(f.key))
    : fieldOptions;
  return autoMapFileHeaders(rawHeaders, activeFields, [], { allowCustomColumns: true });
};
