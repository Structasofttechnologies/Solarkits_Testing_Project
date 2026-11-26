/**
 * websiteTelemetry.js — SolarKits Main Website (http://solarkits.in/)
 * Tracks visitor sessions, SPA page views, engagement heartbeats, UTM attribution, and form conversions.
 */

const SITE_CONFIG = {
  website_key: 'solarkits_main',
  site_domain: 'solarkits.in',
  site_url: 'http://solarkits.in/',
};

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 20000;
const STORAGE_KEYS = {
  visitorId: 'sk_tel_vid_main',
  sessionId: 'sk_tel_sid_main',
  sessionStart: 'sk_tel_start_main',
  lastActive: 'sk_tel_active_main',
  landingUrl: 'sk_tel_landing_main',
  referrer: 'sk_tel_ref_main',
  utm: 'sk_tel_utm_main',
  isReturning: 'sk_tel_ret_main',
  pageViews: 'sk_tel_pv_main',
};

let lastTrackedPath = '';
let lastTrackedAt = 0;

const generateId = (prefix) => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

const safeGet = (storage, key) => {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (storage, key, val) => {
  try {
    storage.setItem(key, val);
  } catch {
    // Ignore storage quota/privacy-mode errors
  }
};

const resolveTelemetryUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL;
  let base = envUrl;
  if (!base && typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.')) {
      base = 'http://localhost:5000/api';
    } else if (host.endsWith('solarkits.in')) {
      base = 'https://api.solarkits.in/api';
    } else {
      base = '/api';
    }
  }
  const clean = String(base || 'http://localhost:5000/api').replace(/\/+$/, '');
  if (clean.endsWith('/api')) return `${clean}/india/v1/telemetry/visit`;
  if (clean.endsWith('/admin-api')) return `${clean}/telemetry/visit`;
  return `${clean}/api/india/v1/telemetry/visit`;
};

const detectDeviceType = () => {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent.toLowerCase();
  if (/(ipad|tablet)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
};

const extractUtmFromSearch = (search = '') => {
  const params = new URLSearchParams(search || '');
  const utm = {};
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((k) => {
    const v = params.get(k);
    if (v) utm[k] = v.trim();
  });
  return utm;
};

const ensureSessionState = () => {
  if (typeof window === 'undefined') {
    return { visitor_id: 'ssr', visitor_session_id: 'ssr', is_returning: false, landing_url: '/', utm: {}, referrer: null, duration_seconds: 0, page_views: 1 };
  }

  const now = Date.now();
  let visitorId = safeGet(window.localStorage, STORAGE_KEYS.visitorId);
  const hadPriorVisitorId = Boolean(visitorId);
  if (!visitorId) {
    visitorId = generateId('vid');
    safeSet(window.localStorage, STORAGE_KEYS.visitorId, visitorId);
  }

  const lastActive = Number(safeGet(window.sessionStorage, STORAGE_KEYS.lastActive) || 0);
  let sessionId = safeGet(window.sessionStorage, STORAGE_KEYS.sessionId);
  const isExpired = !sessionId || (lastActive > 0 && now - lastActive > SESSION_TIMEOUT_MS);

  if (isExpired) {
    sessionId = generateId('sid');
    safeSet(window.sessionStorage, STORAGE_KEYS.sessionId, sessionId);
    safeSet(window.sessionStorage, STORAGE_KEYS.sessionStart, String(now));
    safeSet(window.sessionStorage, STORAGE_KEYS.landingUrl, window.location.pathname || '/');
    safeSet(window.sessionStorage, STORAGE_KEYS.isReturning, hadPriorVisitorId ? '1' : '0');
    safeSet(window.sessionStorage, STORAGE_KEYS.pageViews, '0');
    if (document.referrer) {
      safeSet(window.sessionStorage, STORAGE_KEYS.referrer, document.referrer);
    }
  }

  safeSet(window.sessionStorage, STORAGE_KEYS.lastActive, String(now));

  const currentUtm = extractUtmFromSearch(window.location.search);
  let storedUtm = {};
  try {
    storedUtm = JSON.parse(safeGet(window.sessionStorage, STORAGE_KEYS.utm) || '{}');
  } catch {
    storedUtm = {};
  }
  const mergedUtm = Object.keys(currentUtm).length > 0 ? { ...storedUtm, ...currentUtm } : storedUtm;
  if (Object.keys(currentUtm).length > 0) {
    safeSet(window.sessionStorage, STORAGE_KEYS.utm, JSON.stringify(mergedUtm));
  }

  const startedAt = Number(safeGet(window.sessionStorage, STORAGE_KEYS.sessionStart) || now);
  const durationSeconds = Math.max(0, Math.round((now - startedAt) / 1000));
  const pageViews = Math.max(1, Number(safeGet(window.sessionStorage, STORAGE_KEYS.pageViews) || 1));

  return {
    visitor_id: visitorId,
    visitor_session_id: sessionId,
    is_returning: safeGet(window.sessionStorage, STORAGE_KEYS.isReturning) === '1',
    landing_url: safeGet(window.sessionStorage, STORAGE_KEYS.landingUrl) || window.location.pathname || '/',
    referrer: safeGet(window.sessionStorage, STORAGE_KEYS.referrer) || document.referrer || null,
    utm: mergedUtm,
    duration_seconds: durationSeconds,
    page_views: pageViews,
  };
};

const sendTelemetry = (payload, useBeacon = false) => {
  if (typeof window === 'undefined') return;
  const url = resolveTelemetryUrl();
  const body = JSON.stringify(payload);

  if (useBeacon && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    try {
      const blob = new Blob([body], { type: 'text/plain;charset=UTF-8' });
      if (navigator.sendBeacon(url, blob)) return;
    } catch {
      // Fallback to fetch keepalive
    }
  }

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
    mode: 'cors',
  }).catch(() => {});
};

const buildBasePayload = (eventType, pathOverride = null) => {
  const s = ensureSessionState();
  const currentPath = pathOverride || (typeof window !== 'undefined' ? window.location.pathname : '/');
  return {
    ...SITE_CONFIG,
    event_type: eventType,
    visitor_id: s.visitor_id,
    visitor_session_id: s.visitor_session_id,
    is_returning: s.is_returning,
    landing_url: s.landing_url,
    current_path: currentPath,
    referrer: s.referrer,
    duration_seconds: s.duration_seconds,
    page_views: s.page_views,
    device_type: detectDeviceType(),
    browser_language: typeof navigator !== 'undefined' ? navigator.language : null,
    screen_resolution:
      typeof window !== 'undefined' && window.screen ? `${window.screen.width}x${window.screen.height}` : null,
    ...s.utm,
  };
};

export const trackPageView = (pathWithSearch = '/') => {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  const cleanPath = String(pathWithSearch || '/').split('?')[0] || '/';
  if (lastTrackedPath === cleanPath && now - lastTrackedAt < 1500) {
    return;
  }
  lastTrackedPath = cleanPath;
  lastTrackedAt = now;

  ensureSessionState();
  const prevCount = Number(safeGet(window.sessionStorage, STORAGE_KEYS.pageViews) || 0);
  safeSet(window.sessionStorage, STORAGE_KEYS.pageViews, String(prevCount + 1));

  sendTelemetry(buildBasePayload('page_view', cleanPath));
};

export const trackEngagementHeartbeat = (useBeacon = false) => {
  if (typeof window === 'undefined') return;
  sendTelemetry(buildBasePayload(useBeacon ? 'page_exit' : 'heartbeat'), useBeacon);
};

export const getTelemetryContext = (formKey = null) => {
  const s = ensureSessionState();
  return {
    ...SITE_CONFIG,
    visitor_id: s.visitor_id,
    visitor_session_id: s.visitor_session_id,
    is_returning: s.is_returning,
    landing_url: s.landing_url,
    referrer: s.referrer,
    device_type: detectDeviceType(),
    form_key: formKey || undefined,
    ...s.utm,
  };
};

export const trackFormSubmission = (formKey) => {
  if (typeof window === 'undefined') return;
  sendTelemetry({
    ...buildBasePayload('form_submit'),
    form_key: formKey || 'website_enquiry',
  });
};

export { HEARTBEAT_INTERVAL_MS };
