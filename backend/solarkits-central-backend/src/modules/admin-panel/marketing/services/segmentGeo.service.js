const { FranchiseeCluster } = require('../../models/india_solarshop_db');
const { GeoLevel1, GeoLevel2, GeoLevel3, Cluster } = require('../../models/geolocation_db');

const NON_LATIN_STATE_ALIASES = {
  'महाराष्ट्र': 'maharashtra',
  'गुजरात': 'gujarat',
  'राजस्थान': 'rajasthan',
  'उत्तरप्रदेश': 'uttarpradesh',
  'उत्तर प्रदेश': 'uttarpradesh',
  'मध्यप्रदेश': 'madhyapradesh',
  'मध्य प्रदेश': 'madhyapradesh',
  'कर्नाटक': 'karnataka',
  'तमिलनाडु': 'tamilnadu',
  'दिल्ली': 'delhi',
  'नईदिल्ली': 'delhi',
  'नई दिल्ली': 'delhi',
  'बिहार': 'bihar',
  'हरियाणा': 'haryana',
  'पंजाब': 'punjab',
  'तेलंगाना': 'telangana',
  'आंध्रप्रदेश': 'andhrapradesh',
  'आंध्र प्रदेश': 'andhrapradesh',
  'केरल': 'kerala',
  'ओडिशा': 'odisha',
  'उड़ीसा': 'odisha',
  'झारखंड': 'jharkhand',
  'छत्तीसगढ़': 'chhattisgarh',
  'असम': 'assam',
  'उत्तराखंड': 'uttarakhand',
  'हिमाचलप्रदेश': 'himachalpradesh',
  'हिमाचल प्रदेश': 'himachalpradesh',
  'गोवा': 'goa',
  'पश्चिमबंगाल': 'westbengal',
  'पश्चिम बंगाल': 'westbengal'
};

const STATE_ALIASES = {
  mh: 'maharashtra',
  mah: 'maharashtra',
  maharastra: 'maharashtra',
  gj: 'gujarat',
  guj: 'gujarat',
  gujrat: 'gujarat',
  rj: 'rajasthan',
  raj: 'rajasthan',
  ka: 'karnataka',
  kar: 'karnataka',
  up: 'uttarpradesh',
  mp: 'madhyapradesh',
  tn: 'tamilnadu',
  dl: 'delhi',
  nctofdelhi: 'delhi',
  newdelhi: 'delhi',
  wb: 'westbengal',
  tg: 'telangana',
  ts: 'telangana',
  ap: 'andhrapradesh',
  pb: 'punjab',
  hr: 'haryana',
  kl: 'kerala',
  or: 'odisha',
  od: 'odisha',
  orissa: 'odisha',
  br: 'bihar',
  jh: 'jharkhand',
  cg: 'chhattisgarh',
  chattisgarh: 'chhattisgarh',
  as: 'assam',
  uk: 'uttarakhand',
  ua: 'uttarakhand',
  uttaranchal: 'uttarakhand',
  hp: 'himachalpradesh',
  ga: 'goa',
  jk: 'jammuandkashmir',
  ch: 'chandigarh',
  py: 'puducherry',
  pondicherry: 'puducherry',
  tr: 'tripura',
  mn: 'manipur',
  ml: 'meghalaya',
  mz: 'mizoram',
  nl: 'nagaland',
  sk: 'sikkim',
  ar: 'arunachalpradesh',
  dn: 'dadraandnagarhavelianddamandiu',
  dd: 'dadraandnagarhavelianddamandiu',
  la: 'ladakh',
  ld: 'lakshadweep',
  an: 'andamanandnicobarislands'
};

const DISTRICT_SPELLING_ALIASES = {
  ahmadabad: 'ahmedabad',
  baroda: 'vadodara',
  broach: 'bharuch',
  thedangs: 'dang',
  dangs: 'dang',
  dohad: 'dahod',
  panchmahals: 'panchmahal',
  sabarkantha: 'sabarkantha',
  banaskantha: 'banaskantha',
  bombay: 'mumbai',
  mumbaisuburban: 'mumbaisuburban',
  navimumbai: 'thane',
  kalyan: 'thane',
  dombivli: 'thane',
  kalyandombivli: 'thane',
  ulhasnagar: 'thane',
  bhiwandi: 'thane',
  mirabhayandar: 'thane',
  vasai: 'palghar',
  virar: 'palghar',
  vasaivirar: 'palghar',
  panvel: 'raigad',
  alibag: 'raigad',
  poonah: 'pune',
  poona: 'pune',
  pimprichinchwad: 'pune',
  pimpri: 'pune',
  chinchwad: 'pune',
  baramati: 'pune',
  aurangabad: 'chhatrapatisambhajinagar',
  osmanabad: 'dharashiv',
  ahilyanagar: 'ahmednagar',
  shirdi: 'ahmednagar',
  malegaon: 'nashik',
  bhusawal: 'jalgaon',
  khamgaon: 'buldhana',
  ichalkaranji: 'kolhapur',
  gondiya: 'gondia',
  belgaum: 'belagavi',
  bangalore: 'bengaluru',
  bengaluru: 'bengaluruurban',
  mysore: 'mysuru',
  gulbarga: 'kalaburagi',
  hubli: 'dharwad',
  hubballi: 'dharwad',
  mangalore: 'dakshinakannada',
  mangaluru: 'dakshinakannada',
  bellary: 'ballari',
  bijapur: 'vijayapura',
  shimoga: 'shivamogga',
  tumkur: 'tumakuru',
  gurgaon: 'gurugram',
  mewat: 'nuh',
  noida: 'gautambuddhanagar',
  greaternoida: 'gautambuddhanagar',
  allahabad: 'prayagraj',
  faizabad: 'ayodhya',
  benares: 'varanasi',
  banaras: 'varanasi',
  trivandrum: 'thiruvananthapuram',
  cochin: 'ernakulam',
  kochi: 'ernakulam',
  calicut: 'kozhikode',
  trichur: 'thrissur',
  alleppey: 'alappuzha',
  palghat: 'palakkad',
  quilon: 'kollam',
  cannanore: 'kannur',
  calcutta: 'kolkata',
  madras: 'chennai',
  trichy: 'tiruchirappalli',
  tuticorin: 'thoothukudi',
  vizag: 'visakhapatnam',
  jullundur: 'jalandhar',
  ropar: 'rupnagar',
  mohali: 'sasnagar',
  gauhati: 'kamrupmetropolitan',
  guwahati: 'kamrupmetropolitan',
  vapi: 'valsad',
  ankleshwar: 'bharuch',
  gandhidham: 'kachchh',
  bhuj: 'kachchh',
  kutch: 'kachchh',
  morvi: 'morbi',
  veraval: 'girsomnath',
  palanpur: 'banaskantha',
  himatnagar: 'sabarkantha',
  godhra: 'panchmahal',
  nadiad: 'kheda',
  beawar: 'ajmer',
  kishangarh: 'ajmer',
  bhiwadi: 'alwar',
  lko: 'lucknow',
  chikhli: 'buldhana',
  kannad: 'chhatrapatisambhajinagar',
  mul: 'chandrapur',
  blr: 'bengaluruurban',
  bom: 'mumbai',
  del: 'delhi',
  amd: 'ahmedabad',
  pnq: 'pune',
  ngp: 'nagpur',
  nsk: 'nashik'
};

const cleanGeoToken = (val) => {
  const base = String(val || '')
    .toLowerCase()
    .replace(/bhoomi/g, 'bhumi')
    .replace(/\b(district|dist|region|division|cluster|urban|rural|city|taluka|tehsil|state)\b/g, ' ')
    .replace(/[^a-z0-9]/g, '');
  return DISTRICT_SPELLING_ALIASES[base] || base;
};

const extractGeoCandidateTokens = (val) => {
  const raw = String(val || '').trim();
  if (!raw) return [];
  const parts = raw
    .split(/[,/|;\-]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  // Prefer trailing token (e.g., "Mul, chandrapur" -> "chandrapur") then other parts, then full joined string
  const ordered = parts.length > 1 ? [...parts.slice().reverse(), raw] : [raw];
  const seen = new Set();
  const tokens = [];
  for (const item of ordered) {
    const tok = cleanGeoToken(item);
    if (tok && !seen.has(tok)) {
      seen.add(tok);
      tokens.push(tok);
    }
  }
  return tokens;
};

const cleanStateToken = (val) => {
  const trimmed = String(val || '').trim();
  if (!trimmed) return '';
  const compactUnicode = trimmed.replace(/\s+/g, '');
  if (NON_LATIN_STATE_ALIASES[trimmed]) return NON_LATIN_STATE_ALIASES[trimmed];
  if (NON_LATIN_STATE_ALIASES[compactUnicode]) return NON_LATIN_STATE_ALIASES[compactUnicode];
  const base = trimmed
    .toLowerCase()
    .replace(/\b(state|province|ut)\b/g, ' ')
    .replace(/[^a-z0-9]/g, '');
  return STATE_ALIASES[base] || base;
};

/**
 * Loads live States, Districts, Urban Cities, and Franchisee Cluster masters from MongoDB for deterministic mapping.
 */
const buildGeoAndClusterResolver = async () => {
  const [states, districts, urbanCities, franchiseeClusters, geoClusters] = await Promise.all([
    GeoLevel1.find({ is_active: true, deleted_at: null }).select('_id name').lean(),
    GeoLevel2.find({ is_active: true, deleted_at: null }).select('_id name level_1 cluster').lean(),
    GeoLevel3
      ? GeoLevel3.find({ deleted_at: null }).select('_id name level_2').lean().catch(() => [])
      : Promise.resolve([]),
    FranchiseeCluster.find({ deleted_at: null, status: { $ne: 'inactive' } })
      .select('_id cluster_name cluster_code state_id state_name district_ids district_names color_code status is_active')
      .lean(),
    Cluster.find({ deleted_at: null }).select('_id name level_1').lean()
  ]);

  const stateById = new Map(states.map((s) => [String(s._id), s]));
  const stateByToken = new Map();
  for (const s of states) {
    stateByToken.set(cleanStateToken(s.name), s);
    stateByToken.set(cleanGeoToken(s.name), s);
  }

  const districtById = new Map(districts.map((d) => [String(d._id), d]));
  const districtsByStateAndToken = new Map();
  const globalDistrictsByToken = new Map();

  for (const d of districts) {
    const tok = cleanGeoToken(d.name);
    if (!tok) continue;
    districtsByStateAndToken.set(`${String(d.level_1)}::${tok}`, d);
    if (!globalDistrictsByToken.has(tok)) globalDistrictsByToken.set(tok, []);
    globalDistrictsByToken.get(tok).push(d);
  }

  const cityByStateAndToken = new Map();
  const globalCityByToken = new Map();
  for (const c of urbanCities || []) {
    const tok = cleanGeoToken(c.name);
    const dObj = districtById.get(String(c.level_2));
    if (!tok || !dObj) continue;
    cityByStateAndToken.set(`${String(dObj.level_1)}::${tok}`, dObj);
    if (!globalCityByToken.has(tok)) globalCityByToken.set(tok, []);
    globalCityByToken.get(tok).push(dObj);
  }

  const geoClusterById = new Map(geoClusters.map((c) => [String(c._id), c]));

  const clusterById = new Map();
  const clusterByDistrictId = new Map();
  const clusterByStateAndDistrictTok = new Map();
  const globalClusterByDistrictTok = new Map();
  const clusterByCode = new Map();
  const clusterByStateAndNameTok = new Map();

  for (const clu of franchiseeClusters) {
    clusterById.set(String(clu._id), clu);
    if (clu.cluster_code) clusterByCode.set(String(clu.cluster_code).trim().toUpperCase(), clu);
    if (clu.cluster_name) {
      clusterByStateAndNameTok.set(`${String(clu.state_id)}::${cleanGeoToken(clu.cluster_name)}`, clu);
    }
    for (const dId of clu.district_ids || []) {
      clusterByDistrictId.set(String(dId), clu);
    }
    for (const dName of clu.district_names || []) {
      const tok = cleanGeoToken(dName);
      if (tok) {
        clusterByStateAndDistrictTok.set(`${String(clu.state_id)}::${tok}`, clu);
        if (!globalClusterByDistrictTok.has(tok)) globalClusterByDistrictTok.set(tok, []);
        globalClusterByDistrictTok.get(tok).push(clu);
      }
    }
  }

  const resolve = ({ stateName = '', districtName = '', clusterName = '' }) => {
    const stateTok = cleanStateToken(stateName) || cleanGeoToken(stateName);
    const distTokens = extractGeoCandidateTokens(districtName);
    const distTok = distTokens[0] || '';
    const cluTok = cleanGeoToken(clusterName);

    let stateDoc = stateTok ? stateByToken.get(stateTok) || null : null;
    let districtDoc = null;
    let matchedDistTok = distTok;

    const findDistrictInState = (sId, tok) =>
      districtsByStateAndToken.get(`${String(sId)}::${tok}`) ||
      cityByStateAndToken.get(`${String(sId)}::${tok}`) ||
      null;

    if (stateDoc && distTokens.length > 0) {
      for (const tok of distTokens) {
        const hit = findDistrictInState(stateDoc._id, tok);
        if (hit) {
          districtDoc = hit;
          matchedDistTok = tok;
          break;
        }
      }
    } else if (!stateDoc && distTokens.length > 0) {
      for (const tok of distTokens) {
        const matches = globalDistrictsByToken.get(tok) || globalCityByToken.get(tok) || [];
        if (matches.length > 0) {
          districtDoc = matches[0];
          matchedDistTok = tok;
          stateDoc = stateById.get(String(districtDoc.level_1)) || null;
          break;
        }
      }
    }

    let matchedCluster = null;
    if (clusterName) {
      const codeMatch = clusterByCode.get(String(clusterName).trim().toUpperCase());
      if (codeMatch) matchedCluster = codeMatch;
      else if (stateDoc && cluTok) {
        matchedCluster = clusterByStateAndNameTok.get(`${String(stateDoc._id)}::${cluTok}`) || null;
      }
    }

    if (!matchedCluster && districtDoc) {
      matchedCluster = clusterByDistrictId.get(String(districtDoc._id)) || null;
    }

    if (!matchedCluster && stateDoc && distTokens.length > 0) {
      for (const tok of distTokens) {
        const hit = clusterByStateAndDistrictTok.get(`${String(stateDoc._id)}::${tok}`);
        if (hit) {
          matchedCluster = hit;
          matchedDistTok = tok;
          break;
        }
      }
    }

    // Fallback when State was omitted or differed: resolve Cluster directly from global configured districts
    if (!matchedCluster && distTokens.length > 0) {
      for (const tok of distTokens) {
        const hits = globalClusterByDistrictTok.get(tok) || [];
        if (hits.length > 0) {
          matchedCluster =
            (stateDoc && hits.find((c) => String(c.state_id) === String(stateDoc._id))) || hits[0];
          matchedDistTok = tok;
          break;
        }
      }
    }

    if (!matchedCluster && districtDoc?.cluster) {
      const gc = geoClusterById.get(String(districtDoc.cluster));
      if (gc && stateDoc) {
        matchedCluster = clusterByStateAndNameTok.get(`${String(stateDoc._id)}::${cleanGeoToken(gc.name)}`) || null;
      }
    }

    if (!stateDoc && matchedCluster?.state_id) {
      stateDoc = stateById.get(String(matchedCluster.state_id)) || null;
    }

    return {
      state_id: stateDoc?._id || null,
      state: stateDoc?.name || (cleanStateToken(stateName) ? String(stateName || '').trim() : ''),
      district_id: districtDoc?._id || null,
      district: districtDoc?.name || String(districtName || '').trim(),
      cluster_id: matchedCluster?._id || null,
      cluster_name: matchedCluster?.cluster_name || '',
      cluster_code: matchedCluster?.cluster_code || ''
    };
  };

  return {
    states,
    districts,
    franchiseeClusters,
    stateById,
    districtById,
    clusterById,
    resolve
  };
};

module.exports = {
  NON_LATIN_STATE_ALIASES,
  STATE_ALIASES,
  DISTRICT_SPELLING_ALIASES,
  cleanGeoToken,
  extractGeoCandidateTokens,
  cleanStateToken,
  buildGeoAndClusterResolver
};
