/**
 * mongo.sanitize.js
 *
 * Express 5 compatible middleware to prevent NoSQL injection attacks.
 * Phase R1 — Security Hardening: Roles, Permissions, Audit & Config Masters
 *
 * Strips keys containing '$' or '.' from req.body, req.params, and req.query
 * in-place without reassigning req.query (which is a read-only getter in Express 5).
 */

/**
 * Recursively sanitize keys containing '$' or '.' in-place.
 */
function sanitizeInPlace(obj, replaceWith = '_') {
  if (!obj || typeof obj !== 'object') return;

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      if (typeof obj[i] === 'object' && obj[i] !== null) {
        sanitizeInPlace(obj[i], replaceWith);
      }
    }
    return;
  }

  const keys = Object.keys(obj);
  for (const key of keys) {
    if (key.includes('$') || key.includes('.')) {
      const sanitizedKey = key.replace(/[\$\.]/g, replaceWith);
      obj[sanitizedKey] = obj[key];
      delete obj[key];

      if (typeof obj[sanitizedKey] === 'object' && obj[sanitizedKey] !== null) {
        sanitizeInPlace(obj[sanitizedKey], replaceWith);
      }
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeInPlace(obj[key], replaceWith);
    }
  }
}

const mongoSanitizeMiddleware = (req, res, next) => {
  try {
    if (req.body) sanitizeInPlace(req.body);
    if (req.params) sanitizeInPlace(req.params);
    if (req.query) sanitizeInPlace(req.query);
  } catch (err) {
    console.warn('[MongoSanitize] Error during sanitization:', err.message);
  }
  next();
};

module.exports = mongoSanitizeMiddleware;
