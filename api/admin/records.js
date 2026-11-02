const { validateCustomer } = require('../../lib/customers');
const { callScript } = require('../../lib/google-sheet');
const { configured, hasSession, sameOrigin } = require('../../lib/admin-auth');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (!configured()) return res.status(503).json({ error: 'Management access is not configured.' });
  if (!hasSession(req)) return res.status(401).json({ error: 'Enter the management password.' });
  if (req.method !== 'GET' && !sameOrigin(req)) return res.status(403).json({ error: 'Request origin is not allowed.' });
  try {
    if (req.method === 'GET') {
      const result = await callScript({ action: 'list' });
      if (!Array.isArray(result.rows) || result.rows.some((row) => !row.id)) throw new Error('Update the Google Apps Script deployment to enable management.');
      return res.status(200).json({ rows: result.rows });
    }
    if (req.method === 'POST') {
      const customer = validateCustomer(req.body);
      const result = await callScript({ action: 'append', customer });
      return res.status(201).json({ ok: true, id: result.id });
    }
    if (req.method === 'PATCH' || req.method === 'DELETE') {
      const id = String(req.body?.id || '');
      if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'Select a valid customer record.' });
      const customer = req.method === 'PATCH' ? validateCustomer(req.body?.customer) : undefined;
      await callScript({ action: req.method === 'PATCH' ? 'update' : 'delete', id, customer });
      return res.status(200).json({ ok: true });
    }
    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Management request failed.';
    return res.status(/^(Complete|Select|Enter)/.test(message) ? 400 : 503).json({ error: message });
  }
};
