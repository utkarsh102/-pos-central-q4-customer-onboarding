const { configured, passwordMatches, newSession, hasSession, sessionCookie, sameOrigin } = require('../../lib/admin-auth');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (!configured()) return res.status(503).json({ error: 'Management access is not configured.' });
  if (req.method === 'GET') return res.status(200).json({ authenticated: hasSession(req) });
  if (!sameOrigin(req)) return res.status(403).json({ error: 'Request origin is not allowed.' });
  if (req.method === 'POST') {
    if (!passwordMatches(req.body?.password)) return res.status(401).json({ error: 'Incorrect password.' });
    res.setHeader('Set-Cookie', sessionCookie(req, newSession()));
    return res.status(200).json({ authenticated: true });
  }
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', sessionCookie(req, '', 0));
    return res.status(200).json({ authenticated: false });
  }
  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).json({ error: 'Method not allowed.' });
};
