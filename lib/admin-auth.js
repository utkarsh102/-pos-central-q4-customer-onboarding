const { createHmac, scryptSync, timingSafeEqual, randomBytes } = require('node:crypto');

const COOKIE = 'onboarding_admin';
const SESSION_SECONDS = 12 * 60 * 60;

function configured() {
  return Boolean(process.env.ADMIN_PASSWORD_HASH && process.env.ADMIN_SESSION_SECRET);
}

function passwordMatches(password) {
  const [salt, expected] = String(process.env.ADMIN_PASSWORD_HASH || '').split(':');
  if (typeof password !== 'string' || !salt || !expected || password.length > 256) return false;
  const actual = scryptSync(password, Buffer.from(salt, 'hex'), 64);
  const expectedBytes = Buffer.from(expected, 'hex');
  return expectedBytes.length === actual.length && timingSafeEqual(actual, expectedBytes);
}

function sign(value) {
  return createHmac('sha256', process.env.ADMIN_SESSION_SECRET).update(value).digest('base64url');
}

function newSession() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + SESSION_SECONDS * 1000, nonce: randomBytes(12).toString('hex') })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function hasSession(req) {
  if (!configured()) return false;
  const cookie = String(req.headers?.cookie || '').split(';').map((item) => item.trim()).find((item) => item.startsWith(`${COOKIE}=`));
  const token = cookie?.slice(COOKIE.length + 1);
  if (!token) return false;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return false;
  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return false;
  try {
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return Number.isFinite(value.exp) && value.exp > Date.now();
  } catch { return false; }
}

function sessionCookie(req, token, maxAge = SESSION_SECONDS) {
  const local = /^localhost(?::\d+)?$|^127\.0\.0\.1(?::\d+)?$/.test(String(req.headers?.host || ''));
  return `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=${maxAge}${local ? '' : '; Secure'}`;
}

function sameOrigin(req) {
  try {
    const origin = new URL(req.headers?.origin);
    const host = String(req.headers?.host || '');
    const local = /^localhost(?::\d+)?$|^127\.0\.0\.1(?::\d+)?$/.test(host);
    return origin.host === host && origin.protocol === (local ? 'http:' : 'https:');
  } catch { return false; }
}

module.exports = { configured, passwordMatches, newSession, hasSession, sessionCookie, sameOrigin };
