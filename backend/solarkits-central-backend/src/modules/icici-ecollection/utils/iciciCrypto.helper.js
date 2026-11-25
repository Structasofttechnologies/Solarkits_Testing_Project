/**
 * ICICI Bank E-Collection Hybrid Cryptography Helper
 *
 * Implements RSA 4096-bit asymmetric encryption + AES-128/256-CBC symmetric encryption
 * as mandated by ICICI Bank E-Collection API Specification (v1.0).
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Key paths (configurable via environment variables)
const KEYS_DIR = path.resolve(__dirname, '../../../../src/keys');
const CLIENT_PRIVATE_KEY_PATH = process.env.ICICI_CLIENT_PRIVATE_KEY_PATH || path.join(KEYS_DIR, 'icici_client_private.pem');
const CLIENT_PUBLIC_KEY_PATH = process.env.ICICI_CLIENT_PUBLIC_KEY_PATH || path.join(KEYS_DIR, 'icici_client_public.pem');
const ICICI_PUBLIC_KEY_PATH = process.env.ICICI_BANK_PUBLIC_KEY_PATH || path.join(KEYS_DIR, 'icici_bank_public.cer');

/**
 * Ensures 4096-bit RSA keys exist for local/UAT development.
 * If not present, generates a valid 4096-bit keypair automatically.
 */
function getOrGenerateKeypair() {
  if (!fs.existsSync(KEYS_DIR)) {
    fs.mkdirSync(KEYS_DIR, { recursive: true });
  }

  let privateKeyPem, publicKeyPem;

  if (fs.existsSync(CLIENT_PRIVATE_KEY_PATH) && fs.existsSync(CLIENT_PUBLIC_KEY_PATH)) {
    privateKeyPem = fs.readFileSync(CLIENT_PRIVATE_KEY_PATH, 'utf8');
    publicKeyPem = fs.readFileSync(CLIENT_PUBLIC_KEY_PATH, 'utf8');
  } else {
    console.log('🔑 [ICICI Crypto] Generating 4096-bit RSA keypair for ICICI E-Collection...');
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    fs.writeFileSync(CLIENT_PRIVATE_KEY_PATH, privateKey, { encoding: 'utf8', mode: 0o600 });
    fs.writeFileSync(CLIENT_PUBLIC_KEY_PATH, publicKey, { encoding: 'utf8' });
    privateKeyPem = privateKey;
    publicKeyPem = publicKey;
    console.log('✅ [ICICI Crypto] 4096-bit RSA keys generated at:', CLIENT_PRIVATE_KEY_PATH);
  }

  // Also verify or mock ICICI bank's public key for local testing if not yet supplied by bank
  let iciciPublicKeyPem;
  if (fs.existsSync(ICICI_PUBLIC_KEY_PATH)) {
    iciciPublicKeyPem = fs.readFileSync(ICICI_PUBLIC_KEY_PATH, 'utf8');
  } else {
    // In local development / UAT before bank gives certificate, loopback to our public key
    iciciPublicKeyPem = publicKeyPem;
    fs.writeFileSync(ICICI_PUBLIC_KEY_PATH, publicKeyPem, { encoding: 'utf8' });
    console.log('ℹ️ [ICICI Crypto] Created fallback icici_bank_public.cer (loopback for local testing).');
  }

  return { privateKeyPem, publicKeyPem, iciciPublicKeyPem };
}

/**
 * Decrypts an incoming ICICI Bank encrypted request packet.
 *
 * Handles both ICICI formats:
 * - Format A: Explicit base64 "iv" tag with standalone cipherText
 * - Format B: IV embedded as the first 16 bytes of encryptedData (ICICI default)
 *
 * @param {Object} packet - The ICICI JSON payload
 * @returns {Object} Unencrypted JSON business payload
 */
function decryptRequest(packet) {
  if (!packet || typeof packet !== 'object') {
    throw new Error('Invalid request packet: Must be an object');
  }

  const { encryptedKey, encryptedData, iv: rawIv, oaepHashingAlgorithm } = packet;

  if (!encryptedKey || !encryptedData) {
    throw new Error('Missing encryptedKey or encryptedData in ICICI packet');
  }

  const { privateKeyPem } = getOrGenerateKeypair();

  // Step 1: Decrypt Session Key using RSA 4096 Private Key
  const padding = (oaepHashingAlgorithm && oaepHashingAlgorithm.toUpperCase() === 'SHA1')
    ? crypto.constants.RSA_PKCS1_OAEP_PADDING
    : crypto.constants.RSA_PKCS1_PADDING;

  const keyBuffer = Buffer.from(encryptedKey, 'base64');
  const sessionKeyBuffer = crypto.privateDecrypt(
    {
      key: privateKeyPem,
      padding: padding,
      oaepHash: 'sha1'
    },
    keyBuffer
  );

  // Step 2: Determine IV & CipherText Buffer
  const fullBytes = Buffer.from(encryptedData, 'base64');
  let ivBuffer;
  let cipherTextBuffer;

  if (rawIv && rawIv.trim().length > 0) {
    const candidateIv = Buffer.from(rawIv, 'base64');
    // If the fullBytes starts with this IV (Option B with duplicate IV header), slice it
    if (fullBytes.length > 16 && candidateIv.length === 16 && fullBytes.subarray(0, 16).equals(candidateIv)) {
      ivBuffer = candidateIv;
      cipherTextBuffer = fullBytes.subarray(16);
    } else {
      ivBuffer = candidateIv;
      cipherTextBuffer = fullBytes;
    }
  } else {
    // Default ICICI specification: First 16 bytes of encryptedData is IV
    if (fullBytes.length < 16) {
      throw new Error('Encrypted data too short to contain 16-byte IV');
    }
    ivBuffer = fullBytes.subarray(0, 16);
    cipherTextBuffer = fullBytes.subarray(16);
  }

  // Format Session Key for AES (16 or 32 bytes)
  let aesKey = sessionKeyBuffer;
  if (aesKey.length > 32) {
    aesKey = aesKey.subarray(0, 32);
  } else if (aesKey.length > 16 && aesKey.length < 32) {
    aesKey = aesKey.subarray(0, 16);
  }

  const cipherAlgo = aesKey.length === 32 ? 'aes-256-cbc' : 'aes-128-cbc';

  // Step 3: Symmetrically decrypt using AES-CBC-PKCS5Padding
  const decipher = crypto.createDecipheriv(cipherAlgo, aesKey, ivBuffer);
  decipher.setAutoPadding(true);

  let decrypted = decipher.update(cipherTextBuffer, null, 'utf8');
  decrypted += decipher.final('utf8');

  try {
    return JSON.parse(decrypted);
  } catch (_parseErr) {
    return decrypted;
  }
}

/**
 * Encrypts an outgoing response payload for ICICI Bank using Hybrid Encryption.
 *
 * @param {Object|string} dataPayload - The JSON response object or string to encrypt
 * @param {Object} [options] - Optional overrides (requestId, service, etc.)
 * @returns {Object} Formatted ICICI encrypted JSON packet
 */
function encryptResponse(dataPayload, options = {}) {
  const { iciciPublicKeyPem } = getOrGenerateKeypair();

  const plainText = typeof dataPayload === 'string' ? dataPayload : JSON.stringify(dataPayload);

  // 1. Generate 16-byte random Session Key & 16-byte random IV
  const sessionKey = crypto.randomBytes(16); // 128-bit AES key
  const iv = crypto.randomBytes(16);         // 16-byte IV

  // 2. Symmetrically encrypt dataPayload using AES-128-CBC
  const cipher = crypto.createCipheriv('aes-128-cbc', sessionKey, iv);
  cipher.setAutoPadding(true);

  const cipherText = Buffer.concat([
    cipher.update(Buffer.from(plainText, 'utf8')),
    cipher.final()
  ]);

  // Prepend IV to cipherText as per ICICI recommended response format
  const combinedEncryptedData = Buffer.concat([iv, cipherText]);

  // 3. Asymmetrically encrypt sessionKey using ICICI Bank's 4096-bit Public Certificate
  const encryptedSessionKey = crypto.publicEncrypt(
    {
      key: iciciPublicKeyPem,
      padding: crypto.constants.RSA_PKCS1_PADDING
    },
    sessionKey
  );

  return {
    requestId: options.requestId || '',
    service: options.service || '',
    encryptedKey: encryptedSessionKey.toString('base64'),
    oaepHashingAlgorithm: 'NONE',
    iv: iv.toString('base64'),
    encryptedData: combinedEncryptedData.toString('base64'),
    clientInfo: options.clientInfo || '',
    optionalParam: options.optionalParam || ''
  };
}

module.exports = {
  decryptRequest,
  encryptResponse,
  getOrGenerateKeypair,
  CLIENT_PRIVATE_KEY_PATH,
  CLIENT_PUBLIC_KEY_PATH,
  ICICI_PUBLIC_KEY_PATH
};
