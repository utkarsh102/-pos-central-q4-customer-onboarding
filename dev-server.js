const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const handler = require('./api/customers');

const root = path.resolve(__dirname, 'public');
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.ttf': 'font/ttf', '.txt': 'text/plain' };

http.createServer(async (req, res) => {
  if (req.url?.split('?')[0] === '/api/customers') {
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (value) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(value)); return res; };
    if (req.method === 'POST') {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 10000) { res.writeHead(413).end(); return; }
      }
      try { req.body = JSON.parse(body); }
      catch { res.writeHead(400).end('Invalid JSON.'); return; }
    }
    await handler(req, res);
    return;
  }
  const pathname = decodeURIComponent(req.url?.split('?')[0] || '/');
  const file = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, bytes) => {
    if (error) { res.writeHead(404).end('Not found.'); return; }
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    res.end(bytes);
  });
}).listen(process.env.PORT || 8010, '127.0.0.1', () => console.log(`Onboarding dashboard: http://127.0.0.1:${process.env.PORT || 8010}`));
