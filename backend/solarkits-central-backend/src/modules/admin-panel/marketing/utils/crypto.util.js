const crypto = require('crypto');

const ENC_PREFIX = 'enc:v1:';
let hasWarnedFallbackKey = false;

/**
 * Derive a deterministic 32-byte AES-256 key from configured secret env vars.
 */
function getAesKey() {
  const configured =
    process.env.MARKETING_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    process.env.JWT_ACCESS_SECRET;

  if (!configured && !hasWarnedFallbackKey) {
    hasWarnedFallbackKey = true;
    console.warn(
      '⚠️ [MARKETING_CRYPTO] MARKETING_ENCRYPTION_KEY and JWT_SECRET are unset; using fallback key derivation. Set MARKETING_ENCRYPTION_KEY in production.'
    );
  }

  const rawSecret = configured || `${process.env.MONGO_URI || 'solarkits'}::marketing-v1-key`;
  return crypto.createHash('sha256').update(String(rawSecret)).digest();
}

/**
 * Check whether a string looks like a masked UI placeholder rather than a real secret.
 */
function isMaskedSecret(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return trimmed.includes('••••') || /^\*+$/.test(trimmed) || /\*{4,}/.test(trimmed);
}

/**
 * Encrypt a plaintext credential using AES-256-GCM.
 */
function encryptSecret(plainText) {
  if (plainText === null || plainText === undefined) return plainText;
  const str = String(plainText);
  if (!str) return '';
  if (str.startsWith(ENC_PREFIX)) return str;

  const key = getAesKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(str, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${ENC_PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt an encrypted credential. Legacy plaintext values pass through unchanged.
 */
function decryptSecret(value) {
  if (!value || typeof value !== 'string') return value;
  if (!value.startsWith(ENC_PREFIX)) return value;

  const parts = value.slice(ENC_PREFIX.length).split(':');
  if (parts.length !== 3) {
    throw new Error('Malformed encrypted marketing credential payload.');
  }

  const [ivHex, tagHex, dataHex] = parts;
  const key = getAesKey();
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

  try {
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final()
    ]);
    return decrypted.toString('utf8');
  } catch (err) {
    throw new Error('Failed to decrypt sender credential. Verify MARKETING_ENCRYPTION_KEY / JWT_SECRET.');
  }
}

/**
 * Mask a secret value for safe API responses (preserves short prefix + last 4 chars).
 */
function maskSecret(value) {
  if (!value) return '';
  let plain = value;
  try {
    plain = decryptSecret(String(value));
  } catch (_) {
    return '••••••••';
  }
  const str = String(plain || '');
  if (!str) return '';
  if (str.length <= 6) return '••••••';
  const prefixMatch = str.match(/^(re_|sk_|EAAG|EAA)[A-Za-z0-9_-]*/);
  const prefix = prefixMatch ? `${str.slice(0, Math.min(4, prefixMatch[1].length))}` : '';
  const tail = str.slice(-4);
  return `${prefix}••••••••${tail}`;
}

const SENDER_SECRET_FIELDS = [
  'smtp_pass',
  'resend_api_key',
  'aws_access_key_id',
  'aws_secret_access_key',
  'meta_access_token'
];

/**
 * Return a copy of a sender document with all secret fields safely masked.
 */
function sanitizeSenderForClient(senderDoc) {
  if (!senderDoc) return senderDoc;
  const obj = typeof senderDoc.toObject === 'function' ? senderDoc.toObject() : { ...senderDoc };

  obj.has_smtp_pass = Boolean(obj.smtp_pass);
  obj.has_resend_api_key = Boolean(obj.resend_api_key);
  obj.has_aws_credentials = Boolean(obj.aws_secret_access_key || obj.smtp_pass);
  obj.has_meta_access_token = Boolean(obj.meta_access_token);

  for (const field of SENDER_SECRET_FIELDS) {
    if (obj[field]) {
      obj[field] = maskSecret(obj[field]);
    }
  }
  return obj;
}

module.exports = {
  ENC_PREFIX,
  SENDER_SECRET_FIELDS,
  isMaskedSecret,
  encryptSecret,
  decryptSecret,
  maskSecret,
  sanitizeSenderForClient
};
