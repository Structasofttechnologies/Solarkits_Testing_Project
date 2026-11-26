const crypto = require('crypto');
const { UtmVisit } = require('../models');
const { resolveWebsiteInfo, extractHostFromValue } = require('../constants/websiteRegistry');

const BOT_UA_REGEX =
  /(googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|ahrefsbot|semrushbot|mj12bot|dotbot|petalbot|bytespider|lighthouse|gtmetrix|pingdom|uptimerobot|headlesschrome|phantomjs|^curl\/|^python-requests)/i;

const MAX_SESSION_DURATION_SEC = 14400; // 4h cap to prevent idle overnight tabs skewing averages

const cleanString = (val, maxLen = 300) => {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  return s ? s.slice(0, maxLen) : null;
};

/**
 * Strips protocol/origin/query from URLs so landing pages aggregate consistently per website.
 */
const normalizePagePath = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return '/';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '/';
  let pathPart = trimmed;
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      pathPart = new URL(trimmed).pathname || '/';
    } else {
      pathPart = trimmed.split('?')[0].split('#')[0];
    }
  } catch (_) {
    pathPart = trimmed.split('?')[0].split('#')[0];
  }
  if (!pathPart.startsWith('/')) pathPart = `/${pathPart}`;
  if (pathPart.length > 1) pathPart = pathPart.replace(/\/+$/, '');
  return pathPart.slice(0, 300) || '/';
};

const detectDeviceType = (explicitDevice, userAgent = '') => {
  if (explicitDevice && ['desktop', 'mobile', 'tablet'].includes(String(explicitDevice).toLowerCase())) {
    return String(explicitDevice).toLowerCase();
  }
  const ua = String(userAgent || '').toLowerCase();
  if (!ua) return 'desktop';
  if (/(ipad|tablet|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
};

const extractClientIp = (req = {}) => {
  const fwd = req.headers?.['x-forwarded-for'];
  if (fwd && typeof fwd === 'string') {
    return fwd.split(',')[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || null;
};

const sanitizePayloadObject = (obj) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {};
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('$') || k.includes('.')) continue;
    out[k] = v && typeof v === 'object' && !Array.isArray(v) ? sanitizePayloadObject(v) : v;
  }
  return out;
};

const parseTelemetryBody = (rawBody) => {
  if (!rawBody) return {};
  if (typeof rawBody === 'string') {
    try {
      return sanitizePayloadObject(JSON.parse(rawBody));
    } catch (_) {
      return {};
    }
  }
  return sanitizePayloadObject(rawBody);
};

/**
 * Normalizes an external referrer, ignoring self-referrals from the same domain.
 */
const normalizeReferrer = (rawReferrer, siteDomain) => {
  const ref = cleanString(rawReferrer, 500);
  if (!ref) return null;
  const refHost = extractHostFromValue(ref);
  if (refHost && siteDomain && (refHost === siteDomain || refHost === `www.${siteDomain}`)) {
    return null;
  }
  return ref;
};

/**
 * Records or updates a website session visit from any of the three SolarKits websites.
 */
const recordVisitEvent = async (rawPayload, req = {}) => {
  const payload = parseTelemetryBody(rawPayload);
  const userAgent = cleanString(req.headers?.['user-agent'] || payload.user_agent, 500);

  if (userAgent && BOT_UA_REGEX.test(userAgent)) {
    return { skipped: true, reason: 'bot_user_agent' };
  }

  const websiteInfo = resolveWebsiteInfo({
    website_key: payload.website_key,
    site_domain: payload.site_domain,
    site_url: payload.site_url,
    landing_url: payload.landing_url,
    origin: req.headers?.origin,
    referer: req.headers?.referer,
  });

  const visitorSessionId =
    cleanString(payload.visitor_session_id, 120) ||
    `srv_sid_${crypto.randomUUID()}`;
  const visitorId =
    cleanString(payload.visitor_id, 120) ||
    visitorSessionId;

  const eventType = cleanString(payload.event_type, 40) || 'page_view';
  const currentPath = normalizePagePath(payload.current_path || payload.page_path || payload.landing_url || '/');
  const landingPath = normalizePagePath(payload.landing_url || currentPath);
  const now = new Date();
  const clientIp = cleanString(extractClientIp(req), 80);
  const deviceType = detectDeviceType(payload.device_type, userAgent);
  const referrer = normalizeReferrer(payload.referrer, websiteInfo.site_domain);

  const utmSource = cleanString(payload.utm_source, 120);
  const utmMedium = cleanString(payload.utm_medium, 120);
  const utmCampaign = cleanString(payload.utm_campaign, 160);
  const utmContent = cleanString(payload.utm_content, 160);
  const utmTerm = cleanString(payload.utm_term, 160);

  const existing = await UtmVisit.findOne({
    website_key: websiteInfo.website_key,
    visitor_session_id: visitorSessionId,
  });

  if (!existing) {
    let isReturning = Boolean(payload.is_returning);
    if (!isReturning && visitorId) {
      const priorVisit = await UtmVisit.exists({
        website_key: websiteInfo.website_key,
        visitor_id: visitorId,
        visitor_session_id: { $ne: visitorSessionId },
      });
      isReturning = Boolean(priorVisit);
    }

    const initialDuration = Math.max(
      0,
      Math.min(MAX_SESSION_DURATION_SEC, Math.round(Number(payload.duration_seconds) || 0))
    );
    const initialPageViews = Math.max(1, Math.round(Number(payload.page_views) || 1));
    const isFormEvent = eventType === 'form_submit';
    const isEngaged = initialPageViews > 1 || initialDuration >= 10 || isFormEvent;

    const createDoc = {
      website_key: websiteInfo.website_key,
      site_domain: websiteInfo.site_domain,
      site_url: websiteInfo.site_url,
      visitor_id: visitorId,
      visitor_session_id: visitorSessionId,
      is_returning: isReturning,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      utm_content: utmContent,
      utm_term: utmTerm,
      landing_url: landingPath,
      page_path: currentPath,
      visited_pages: [currentPath],
      page_views: initialPageViews,
      duration_seconds: initialDuration,
      is_bounce: !isEngaged,
      referrer,
      ip_address: clientIp,
      user_agent: userAgent,
      device_type: deviceType,
      browser_language: cleanString(payload.browser_language, 32),
      screen_resolution: cleanString(payload.screen_resolution, 32),
      has_form_submitted: isFormEvent,
      form_key: isFormEvent ? cleanString(payload.form_key, 80) : null,
      first_touch_at: now,
      last_touch_at: now,
      visit_count: initialPageViews,
    };

    try {
      const created = await UtmVisit.create(createDoc);
      return {
        created: true,
        website_key: created.website_key,
        visitor_session_id: created.visitor_session_id,
      };
    } catch (err) {
      // Handle rare concurrent upsert race (e.g. fast mount + route change) by falling through to update
      if (err?.code !== 11000) throw err;
    }
  }

  const targetDoc =
    existing ||
    (await UtmVisit.findOne({
      website_key: websiteInfo.website_key,
      visitor_session_id: visitorSessionId,
    }));

  if (!targetDoc) {
    return { created: false, website_key: websiteInfo.website_key, visitor_session_id: visitorSessionId };
  }

  const firstTouch = targetDoc.first_touch_at ? new Date(targetDoc.first_touch_at) : now;
  const elapsedSec = Math.max(0, Math.min(MAX_SESSION_DURATION_SEC, Math.round((now - firstTouch) / 1000)));
  const reportedSec = Math.max(0, Math.min(MAX_SESSION_DURATION_SEC, Math.round(Number(payload.duration_seconds) || 0)));
  const nextDuration = Math.max(targetDoc.duration_seconds || 0, elapsedSec, reportedSec);

  const updateSet = {
    last_touch_at: now,
    duration_seconds: nextDuration,
    page_path: currentPath,
  };

  if (!targetDoc.utm_source && utmSource) updateSet.utm_source = utmSource;
  if (!targetDoc.utm_medium && utmMedium) updateSet.utm_medium = utmMedium;
  if (!targetDoc.utm_campaign && utmCampaign) updateSet.utm_campaign = utmCampaign;
  if (!targetDoc.utm_content && utmContent) updateSet.utm_content = utmContent;
  if (!targetDoc.utm_term && utmTerm) updateSet.utm_term = utmTerm;
  if (!targetDoc.referrer && referrer) updateSet.referrer = referrer;

  const updateOps = { $set: updateSet };

  let nextPageViews = targetDoc.page_views || targetDoc.visit_count || 1;
  if (eventType === 'page_view') {
    const lastVisited = Array.isArray(targetDoc.visited_pages)
      ? targetDoc.visited_pages[targetDoc.visited_pages.length - 1]
      : null;
    if (lastVisited !== currentPath || payload.force_page_view) {
      nextPageViews += 1;
      updateOps.$inc = { page_views: 1, visit_count: 1 };
      if (!Array.isArray(targetDoc.visited_pages) || targetDoc.visited_pages.length < 50) {
        updateOps.$addToSet = { visited_pages: currentPath };
      }
    }
  }

  if (eventType === 'form_submit') {
    updateSet.has_form_submitted = true;
    if (payload.form_key) updateSet.form_key = cleanString(payload.form_key, 80);
  }

  const engaged = nextPageViews > 1 || nextDuration >= 10 || targetDoc.has_form_submitted || eventType === 'form_submit';
  if (engaged) {
    updateSet.is_bounce = false;
  }

  await UtmVisit.updateOne({ _id: targetDoc._id }, updateOps);

  return {
    updated: true,
    website_key: websiteInfo.website_key,
    visitor_session_id: visitorSessionId,
  };
};

/**
 * Bridges a newly created WebsiteEpcLead or FranchiseLead back to its visitor session in UtmVisit.
 * Creates a visit record if none existed (e.g. if an ad-blocker blocked the initial beacon).
 */
const linkLeadToVisit = async (tracking = {}, { lead_id, lead_model, form_key, website_key_fallback } = {}, req = {}) => {
  try {
    const info = resolveWebsiteInfo({
      website_key: tracking?.website_key || website_key_fallback,
      site_domain: tracking?.site_domain,
      site_url: tracking?.site_url,
      landing_url: tracking?.landing_url,
      origin: req.headers?.origin,
      referer: req.headers?.referer,
    });

    const visitorSessionId =
      cleanString(tracking?.visitor_session_id, 120) ||
      `lead_sid_${String(lead_id || crypto.randomUUID())}`;
    const visitorId = cleanString(tracking?.visitor_id, 120) || visitorSessionId;
    const landingPath = normalizePagePath(tracking?.landing_url || '/');
    const now = new Date();

    const existing = await UtmVisit.findOne({
      website_key: info.website_key,
      visitor_session_id: visitorSessionId,
    });

    if (existing) {
      await UtmVisit.updateOne(
        { _id: existing._id },
        {
          $set: {
            has_form_submitted: true,
            form_key: cleanString(form_key || tracking?.form_key, 80) || existing.form_key || 'website_enquiry',
            lead_id: lead_id || existing.lead_id,
            lead_model: lead_model || existing.lead_model,
            is_bounce: false,
            last_touch_at: now,
          },
        }
      );
      return true;
    }

    await UtmVisit.create({
      website_key: info.website_key,
      site_domain: info.site_domain,
      site_url: info.site_url,
      visitor_id: visitorId,
      visitor_session_id: visitorSessionId,
      is_returning: Boolean(tracking?.is_returning),
      utm_source: cleanString(tracking?.utm_source, 120),
      utm_medium: cleanString(tracking?.utm_medium, 120),
      utm_campaign: cleanString(tracking?.utm_campaign, 160),
      utm_content: cleanString(tracking?.utm_content, 160),
      utm_term: cleanString(tracking?.utm_term, 160),
      landing_url: landingPath,
      page_path: landingPath,
      visited_pages: [landingPath],
      page_views: 1,
      duration_seconds: 0,
      is_bounce: false,
      referrer: normalizeReferrer(tracking?.referrer || req.headers?.referer, info.site_domain),
      ip_address: cleanString(extractClientIp(req), 80),
      user_agent: cleanString(req.headers?.['user-agent'], 500),
      device_type: detectDeviceType(tracking?.device_type, req.headers?.['user-agent']),
      has_form_submitted: true,
      form_key: cleanString(form_key || tracking?.form_key, 80) || 'website_enquiry',
      lead_id: lead_id || null,
      lead_model: lead_model || null,
      first_touch_at: now,
      last_touch_at: now,
      visit_count: 1,
    });
    return true;
  } catch (err) {
    console.warn('[WebTelemetry] Non-fatal linkLeadToVisit warning:', err.message);
    return false;
  }
};

module.exports = {
  recordVisitEvent,
  linkLeadToVisit,
  normalizePagePath,
  detectDeviceType,
  parseTelemetryBody,
};
