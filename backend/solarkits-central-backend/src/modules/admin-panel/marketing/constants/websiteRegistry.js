/**
 * websiteRegistry.js
 * Canonical registry and resolver for the three SolarKits public websites
 * tracked in Main Admin Dashboard -> Website Performance.
 */

const TRACKED_WEBSITES = [
  {
    website_key: 'solarkits_main',
    site_domain: 'solarkits.in',
    site_url: 'http://solarkits.in/',
    label: 'SolarKits Main',
    short_label: 'solarkits.in',
    color: '#2563eb',
    aliases: [
      'solarkits_main',
      'solarkits-main',
      'solar-kits',
      'solarkits.in',
      'www.solarkits.in',
      'solarkits-solarshop-india.onrender.com',
      'localhost:5177',
    ],
  },
  {
    website_key: 'solar_store',
    site_domain: 'store.solarkits.in',
    site_url: 'https://store.solarkits.in/',
    label: 'Solar Store',
    short_label: 'store.solarkits.in',
    color: '#10b981',
    aliases: [
      'solar_store',
      'solar-store',
      'store.solarkits.in',
      'solar-store-9r0g.onrender.com',
      'localhost:5179',
    ],
  },
  {
    website_key: 'franchise_portal',
    site_domain: 'franchise.solarkits.in',
    site_url: 'https://franchise.solarkits.in/',
    label: 'Franchise Portal',
    short_label: 'franchise.solarkits.in',
    color: '#f59e0b',
    aliases: [
      'franchise_portal',
      'franchise-portal',
      'franchise',
      'franchise.solarkits.in',
      'solarkits-reseller-portal.onrender.com',
      'localhost:5178',
    ],
  },
];

const WEBSITE_MAP = new Map(TRACKED_WEBSITES.map((w) => [w.website_key, w]));

// Match specific subdomains before root domain so store.solarkits.in never resolves to solarkits.in
const MATCH_ORDER = [
  WEBSITE_MAP.get('solar_store'),
  WEBSITE_MAP.get('franchise_portal'),
  WEBSITE_MAP.get('solarkits_main'),
];

const extractHostFromValue = (raw) => {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return '';
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return new URL(trimmed).host.toLowerCase();
    }
  } catch (_) {
    // Fall back to string stripping
  }
  return trimmed.replace(/^https?:\/\//, '').split('/')[0].split('?')[0].toLowerCase();
};

const matchCandidate = (candidate) => {
  if (!candidate || typeof candidate !== 'string') return null;
  const normalized = candidate.trim().toLowerCase();
  if (!normalized) return null;

  if (WEBSITE_MAP.has(normalized)) {
    return WEBSITE_MAP.get(normalized);
  }

  const host = extractHostFromValue(normalized);
  for (const site of MATCH_ORDER) {
    if (
      site.aliases.some(
        (alias) =>
          normalized === alias ||
          host === alias ||
          host.startsWith(`${alias}:`) ||
          (alias.includes('.') && host.includes(alias))
      )
    ) {
      return site;
    }
  }
  return null;
};

/**
 * Resolves canonical { website_key, site_domain, site_url, label } from payload or request headers.
 */
const resolveWebsiteInfo = ({
  website_key,
  site_domain,
  site_url,
  landing_url,
  origin,
  referer,
} = {}) => {
  const candidates = [website_key, site_domain, site_url, origin, landing_url, referer];
  for (const cand of candidates) {
    const matched = matchCandidate(cand);
    if (matched) {
      return {
        website_key: matched.website_key,
        site_domain: matched.site_domain,
        site_url: matched.site_url,
        label: matched.label,
      };
    }
  }

  return {
    website_key: 'solarkits_main',
    site_domain: extractHostFromValue(site_domain || origin || site_url) || 'solarkits.in',
    site_url: site_url || 'http://solarkits.in/',
    label: 'SolarKits Main',
  };
};

const getWebsiteByKey = (key) => WEBSITE_MAP.get(key) || null;

module.exports = {
  TRACKED_WEBSITES,
  WEBSITE_MAP,
  resolveWebsiteInfo,
  getWebsiteByKey,
  extractHostFromValue,
};
