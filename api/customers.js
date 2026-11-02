const { validateCustomer, summarize, parseCsv, isQ4Date, MONTHS } = require('../lib/customers');
const { callScript } = require('../lib/google-sheet');

const SHEET_ID = '1FesJ9Phs07BGwtwLA0GF_j-14XRx8urJ7mqBfg5zjyA';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;

async function readRows() {
  const response = await fetch(`${CSV_URL}&v=${Date.now()}`, { signal: AbortSignal.timeout(15000), cache: 'no-store' });
  if (!response.ok) throw new Error('Could not read the public Google Sheet.');
  return parseCsv(await response.text());
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  try {
    if (req.method === 'GET') {
      const rows = await readRows();
      const customers = rows.map((row) => ({
        ...row,
        q4Month: isQ4Date(row.signUpDate) ? MONTHS[Number(row.signUpDate.slice(5, 7)) - 10] : null
      }));
      return res.status(200).json({ ...summarize(rows), customers, updatedAt: new Date().toISOString(), writeReady: Boolean(process.env.APPS_SCRIPT_URL && process.env.SHEET_WRITE_SECRET) });
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
