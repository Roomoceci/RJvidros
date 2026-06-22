const crypto = require('crypto');

const HASH_PREFIX = 'pbkdf2';
const HASH_ITERATIONS = 120000;
const HASH_LENGTH = 32;
const HASH_DIGEST = 'sha256';
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000;

function base64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function fromBase64Url(input) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized, 'base64').toString('utf8');
}

function getTokenSecret() {
  const secret = process.env.AUTH_TOKEN_SECRET || process.env.ADMIN_PASSWORD;

  if (process.env.NODE_ENV === 'production' && !secret) {
    throw new Error('AUTH_TOKEN_SECRET precisa ser configurado em producao.');
  }

  return secret || 'RJvidros-dev-secret';
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(String(password), salt, HASH_ITERATIONS, HASH_LENGTH, HASH_DIGEST)
    .toString('hex');

  return `${HASH_PREFIX}$${HASH_ITERATIONS}$${salt}$${hash}`;
}

function isPasswordHash(value) {
  return String(value || '').startsWith(`${HASH_PREFIX}$`);
}

function verifyPassword(password, storedPassword) {
  if (!isPasswordHash(storedPassword)) {
    return String(password) === String(storedPassword);
  }

  const [, iterations, salt, storedHash] = String(storedPassword).split('$');
  const computedHash = crypto
    .pbkdf2Sync(String(password), salt, Number(iterations), Buffer.from(storedHash, 'hex').length, HASH_DIGEST)
    .toString('hex');

  return crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(storedHash, 'hex'));
}

function signToken(payload) {
  return crypto
    .createHmac('sha256', getTokenSecret())
    .update(payload)
    .digest('base64url');
}

function createToken(user) {
  const payload = base64Url(JSON.stringify({
    sub: user.id,
    email: user.email,
    name: user.name,
    exp: Date.now() + TOKEN_TTL_MS
  }));
  const signature = signToken(payload);

  return `${payload}.${signature}`;
}

function verifyToken(token) {
  try {
    const [payload, signature] = String(token || '').split('.');
    if (!payload || !signature) return null;

    const expectedSignature = signToken(payload);
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (signatureBuffer.length !== expectedBuffer.length) return null;
    if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

    const data = JSON.parse(fromBase64Url(payload));
    if (!data.exp || Date.now() > data.exp) return null;

    return data;
  } catch (error) {
    return null;
  }
}

module.exports = {
  createToken,
  hashPassword,
  isPasswordHash,
  verifyPassword,
  verifyToken
};
