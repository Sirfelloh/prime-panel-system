/**
 * Prime Panel Limited — HR Accounts System Server
 * Run with: node server.js
 * Then open: http://localhost:3000
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

const PORT    = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

// ── Ensure db.json exists ──────────────────────────────────
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ employees: [], transactions: [] }, null, 2));
  console.log('📁 Created fresh db.json');
}

// ── MIME types ─────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.ico':  'image/x-icon',
  '.png':  'image/png',
};

// ── Request handler ────────────────────────────────────────
const server = http.createServer((req, res) => {
  // CORS headers (allow all origins for LAN access)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url.split('?')[0]; // strip query strings

  // ── API: GET entire database ─────────────────────────────
  if (req.method === 'GET' && url === '/api/db') {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    } catch (e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Could not read database' }));
    }
    return;
  }

  // ── API: POST (save entire database) ────────────────────
  if (req.method === 'POST' && url === '/api/db') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 5e6) req.destroy(); }); // 5MB limit
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        // Basic validation
        if (!Array.isArray(parsed.employees) || !Array.isArray(parsed.transactions)) {
          throw new Error('Invalid structure');
        }
        // Write atomically via temp file
        const tmp = DB_FILE + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify(parsed, null, 2));
        fs.renameSync(tmp, DB_FILE);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, saved: new Date().toISOString() }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON: ' + e.message }));
      }
    });
    return;
  }

  // ── API: Backup download ─────────────────────────────────
  if (req.method === 'GET' && url === '/api/backup') {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    const stamp = new Date().toISOString().slice(0,10);
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="primepanel-backup-${stamp}.json"`,
    });
    res.end(data);
    return;
  }

  // ── Serve static files ───────────────────────────────────
  let filePath = path.join(__dirname, url === '/' ? 'index.html' : url);

  // Security: prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (!fs.existsSync(filePath)) {
    // Fallback: serve index.html for SPA routing
    filePath = path.join(__dirname, 'index.html');
  }

  try {
    const ext  = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'text/plain';
    res.writeHead(200, { 'Content-Type': mime });
    fs.createReadStream(filePath).pipe(res);
  } catch (e) {
    res.writeHead(500);
    res.end('Server error');
  }
});

// ── Start server ───────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  const nets = os.networkInterfaces();
  const ips  = Object.values(nets)
    .flat()
    .filter(n => n.family === 'IPv4' && !n.internal)
    .map(n => n.address);

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   PRIME PANEL LIMITED — HR Accounts System   ║');
  console.log('╚══════════════════════════════════════════════╝\n');
  console.log('✅  Server is running!\n');
  console.log('📍  On this computer:');
  console.log(`    http://localhost:${PORT}\n`);

  if (ips.length) {
    console.log('📡  From other devices on the same Wi-Fi / network:');
    ips.forEach(ip => console.log(`    http://${ip}:${PORT}`));
    console.log('\n💡  Share one of the addresses above with your team.');
  }

  console.log('\n💾  Database file:', DB_FILE);
  console.log('📦  Backup endpoint: http://localhost:' + PORT + '/api/backup');
  console.log('\n  Press Ctrl+C to stop the server.\n');
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌  Port ${PORT} is already in use.`);
    console.error(`    Try: node server.js  (or change PORT in the file)\n`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});
