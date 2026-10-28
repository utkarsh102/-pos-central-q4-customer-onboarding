const { validateCustomer, summarize, parseCsv, isQ4Date } = require('../lib/customers');

const SHEET_ID = '1FesJ9Phs07BGwtwLA0GF_j-14XRx8urJ7mqBfg5zjyA';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;

async function callScript(payload) {
  const url = process.env.APPS_SCRIPT_URL;
  const secret = process.env.SHEET_WRITE_SECRET;
  if (!url || !secret) throw new Error('Google Sheet write connection is not configured.');
  if (!/^https:\/\/script\.google\.com\/macros\/s\//.test(url)) throw new Error('Google Apps Script URL is invalid.');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...payload, secret }),
    redirect: 'follow',
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error('Google Sheet connection failed.');
  const result = await response.json().catch(() => null);
  if (!result || result.ok !== true) throw new Error(result?.error || 'Google Sheet rejected the request.');
  return result;
}

async function readRows() {
  if (process.env.APPS_SCRIPT_URL && process.env.SHEET_WRITE_SECRET) {
    const result = await callScript({ action: 'list' });
    if (!Array.isArray(result.rows)) throw new Error('Google Sheet returned invalid data.');
    return result.rows;
  }
  const response = await fetch(`${CSV_URL}&v=${Date.now()}`, { signal: AbortSignal.timeout(15000), cache: 'no-store' });
  if (!response.ok) throw new Error('Could not read the public Google Sheet.');
  return parseCsv(await response.text());
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  try {
    if (req.method === 'GET') {
      const rows = await readRows();
      return res.status(200).json({ ...summarize(rows), updatedAt: new Date().toISOString(), writeReady: Boolean(process.env.APPS_SCRIPT_URL && process.env.SHEET_WRITE_SECRET) });
    }
    if (req.method === 'POST') {
      const input = validateCustomer(req.body);
      await callScript({ action: 'append', customer: input });
      return res.status(201).json({ ok: true, countsInQ4: isQ4Date(input.signUpDate) });
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error.';
    const clientError = /^(Complete|Select|Enter)/.test(message);
    return res.status(clientError ? 400 : 503).json({ error: message });
  }
};
