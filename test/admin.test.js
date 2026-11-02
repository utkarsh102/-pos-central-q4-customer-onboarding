const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes, scryptSync } = require('node:crypto');
const auth = require('../lib/admin-auth');
const sessionHandler = require('../api/admin/session');
const recordsHandler = require('../api/admin/records');

function response() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

test('management requires a password and rejects requests without a session', async () => {
  const oldHash = process.env.ADMIN_PASSWORD_HASH;
  const oldSecret = process.env.ADMIN_SESSION_SECRET;
  const salt = randomBytes(16);
  process.env.ADMIN_PASSWORD_HASH = `${salt.toString('hex')}:${scryptSync('strong-test-password', salt, 64).toString('hex')}`;
  process.env.ADMIN_SESSION_SECRET = randomBytes(32).toString('hex');
  try {
    const headers = { host: 'localhost:8010', origin: 'http://localhost:8010' };
    const denied = response();
    await recordsHandler({ method: 'DELETE', headers, body: { id: '00000000-0000-4000-8000-000000000001' } }, denied);
    assert.equal(denied.statusCode, 401);

    const wrong = response();
    await sessionHandler({ method: 'POST', headers, body: { password: 'wrong' } }, wrong);
    assert.equal(wrong.statusCode, 401);

    const login = response();
    await sessionHandler({ method: 'POST', headers, body: { password: 'strong-test-password' } }, login);
    assert.equal(login.statusCode, 200);
    assert.match(login.headers['Set-Cookie'], /HttpOnly; SameSite=Strict/);
    const cookie = login.headers['Set-Cookie'].split(';')[0];
    assert.equal(auth.hasSession({ headers: { cookie } }), true);
    assert.equal(auth.hasSession({ headers: { cookie: cookie + 'tampered' } }), false);
    assert.equal(auth.sameOrigin({ headers: { host: 'localhost:8010', origin: 'https://evil.example' } }), false);
  } finally {
    if (oldHash === undefined) delete process.env.ADMIN_PASSWORD_HASH;
    else process.env.ADMIN_PASSWORD_HASH = oldHash;
    if (oldSecret === undefined) delete process.env.ADMIN_SESSION_SECRET;
    else process.env.ADMIN_SESSION_SECRET = oldSecret;
  }
});
