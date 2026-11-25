'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

let cachedPrivateKey = null;
let cachedPublicKey = null;

/**
 * Normalizes a PEM string, fixing escaped newlines (\n) commonly caused by
 * environment variables set in cloud hosting dashboards (Render, Heroku, etc.).
 */
function normalizeKey(keyStr) {
  if (!keyStr || typeof keyStr !== 'string') return null;
  let trimmed = keyStr.trim();
  if (trimmed.includes('\\n')) {
    trimmed = trimmed.replace(/\\n/g, '\n');
  }
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Attempts to load key content from an array of candidate file paths.
 */
function tryLoadFromPaths(candidatePaths) {
  for (const candidate of candidatePaths) {
    if (!candidate) continue;
    try {
      const resolved = path.resolve(candidate);
      if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
        const content = fs.readFileSync(resolved, 'utf8');
        const normalized = normalizeKey(content);
        if (normalized) {
          return { key: normalized, source: resolved };
        }
      }
    } catch {
      // Continue to next candidate
    }
  }
  return null;
}

/**
 * Automatically loads or provisions RSA private and public keys.
 * Ensures the application NEVER crashes due to missing JWT keys.
 */
function loadKeys() {
  if (cachedPrivateKey && cachedPublicKey) {
    return { privateKey: cachedPrivateKey, publicKey: cachedPublicKey };
  }

  // 1. Check environment variables
  const envPrivate = normalizeKey(process.env.PRIVATE_KEY || process.env.JWT_PRIVATE_KEY);
  const envPublic = normalizeKey(process.env.PUBLIC_KEY || process.env.JWT_PUBLIC_KEY);

  let privateKey = envPrivate;
  let publicKey = envPublic;

  // 2. Candidate disk paths
  const keysDir = path.resolve(__dirname, '../keys');
  const cwd = process.cwd();

  const privateCandidates = [
    process.env.PRIVATE_KEY_PATH,
    path.join(keysDir, 'private.key'),
    path.join(keysDir, 'private.pem'),
    path.join(cwd, 'src/keys/private.key'),
    path.join(cwd, 'backend/solarkits-central-backend/src/keys/private.key'),
    './src/keys/private.key',
    './src/keys/private.pem'
  ];

  const publicCandidates = [
    process.env.PUBLIC_KEY_PATH,
    path.join(keysDir, 'public.key'),
    path.join(keysDir, 'public.pem'),
    path.join(cwd, 'src/keys/public.key'),
    path.join(cwd, 'backend/solarkits-central-backend/src/keys/public.key'),
    './src/keys/public.key',
    './src/keys/public.pem'
  ];

  if (!privateKey) {
    const loaded = tryLoadFromPaths(privateCandidates);
    if (loaded) {
      privateKey = loaded.key;
    }
  }

  if (!publicKey) {
    const loaded = tryLoadFromPaths(publicCandidates);
    if (loaded) {
      publicKey = loaded.key;
    }
  }

  // 3. If private key exists but public key does not, derive public key from private key
  if (privateKey && !publicKey) {
    try {
      const pubKeyObj = crypto.createPublicKey(privateKey);
      publicKey = pubKeyObj.export({ type: 'spki', format: 'pem' });
    } catch (err) {
      console.warn(`[JWT Key Provider] Failed to derive public key from private key: ${err.message}`);
    }
  }

  // 4. If keys are STILL missing (e.g. fresh clone or missing file), auto-generate an RSA key pair!
  if (!privateKey || !publicKey) {
    try {
      console.warn('⚠️ [JWT Key Provider] RSA keys not found in env or files. Auto-generating 2048-bit RSA key pair...');
      const keyPair = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });

      privateKey = keyPair.privateKey;
      publicKey = keyPair.publicKey;

      // Persist to disk if directory exists or can be created
      try {
        if (!fs.existsSync(keysDir)) {
          fs.mkdirSync(keysDir, { recursive: true });
        }
        const targetPrivate = path.join(keysDir, 'private.key');
        const targetPublic = path.join(keysDir, 'public.key');
        if (!fs.existsSync(targetPrivate)) {
          fs.writeFileSync(targetPrivate, privateKey, { encoding: 'utf8', mode: 0o600 });
        }
        if (!fs.existsSync(targetPublic)) {
          fs.writeFileSync(targetPublic, publicKey, { encoding: 'utf8' });
        }
        console.log(`✅ [JWT Key Provider] Auto-generated RSA keys persisted to: ${keysDir}`);
      } catch (saveErr) {
        console.warn(`[JWT Key Provider] Could not persist keys to disk (using in-memory): ${saveErr.message}`);
      }
    } catch (genErr) {
      console.error(`❌ [JWT Key Provider] RSA key generation failed: ${genErr.message}`);
    }
  }

  cachedPrivateKey = privateKey;
  cachedPublicKey = publicKey;

  return { privateKey: cachedPrivateKey, publicKey: cachedPublicKey };
}

/**
 * Get the loaded private key (or fallback secret).
 */
function getPrivateKey() {
  const { privateKey } = loadKeys();
  return privateKey || process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'emergesun_fallback_jwt_secret_key_2026';
}

/**
 * Get the loaded public key (or fallback secret).
 */
function getPublicKey() {
  const { publicKey, privateKey } = loadKeys();
  return publicKey || privateKey || process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'emergesun_fallback_jwt_secret_key_2026';
}

/**
 * Universal token signer.
 * Automatically chooses RS512 if an RSA private key is available, else HS256.
 * Accepts either an options object ({ expiresIn: '1d' }) or a string/number expiresIn ('1d').
 */
function signToken(payload, options = {}) {
  let signOptions = {};
  if (typeof options === 'string' || typeof options === 'number') {
    signOptions = { expiresIn: options };
  } else if (options && typeof options === 'object') {
    signOptions = { ...options };
  }

  const key = getPrivateKey();
  const isRsa = typeof key === 'string' && key.includes('BEGIN') && key.includes('PRIVATE KEY');

  if (!signOptions.algorithm) {
    signOptions.algorithm = isRsa ? 'RS512' : 'HS256';
  }

  return jwt.sign(payload, key, signOptions);
}

/**
 * Universal token verifier.
 * Supports verifying tokens signed with RS512, RS256, or HS256.
 */
function verifyToken(token, options = {}) {
  const pubKey = getPublicKey();
  const isRsa = typeof pubKey === 'string' && pubKey.includes('BEGIN');
  const allowedAlgorithms = isRsa ? ['RS512', 'RS256', 'HS256'] : ['HS256', 'RS512', 'RS256'];
  return jwt.verify(token, pubKey, {
    algorithms: options.algorithms || allowedAlgorithms,
    ...options
  });
}

// Pre-initialize on module load to validate keys early and log status
loadKeys();

module.exports = {
  loadKeys,
  getPrivateKey,
  getPublicKey,
  signToken,
  verifyToken
};
