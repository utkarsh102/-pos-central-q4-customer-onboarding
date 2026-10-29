const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/customers');

test('reads public sheet CSV even when the write connection is configured', async () => {
  const previousUrl = process.env.APPS_SCRIPT_URL;
  const previousSecret = process.env.SHEET_WRITE_SECRET;
  const previousFetch = global.fetch;
  process.env.APPS_SCRIPT_URL = 'https://script.google.com/macros/s/example/exec';
  process.env.SHEET_WRITE_SECRET = 'test-secret';
  let requestedUrl;
  global.fetch = async (url) => {
    requestedUrl = url;
    return { ok: true, text: async () => 'Sales Team Member,Customer Name,Company Name,Sign Up Date,Product\nTripti,Example Customer,Example Company,2026-10-29,Clover\n' };
  };
  const res = {
    statusCode: 200,
    setHeader() {},
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
  try {
    await handler({ method: 'GET' }, res);
    assert.equal(res.statusCode, 200);
    assert.match(requestedUrl, /\/export\?format=csv/);
    assert.equal(res.body.total, 1);
    assert.equal(res.body.counts.Tripti, 1);
    assert.equal(res.body.writeReady, true);
  } finally {
    global.fetch = previousFetch;
    if (previousUrl === undefined) delete process.env.APPS_SCRIPT_URL;
    else process.env.APPS_SCRIPT_URL = previousUrl;
    if (previousSecret === undefined) delete process.env.SHEET_WRITE_SECRET;
    else process.env.SHEET_WRITE_SECRET = previousSecret;
  }
});
