# Prime Panel Limited — HR System Setup Guide
## How to Deploy the System So Everyone Can Access It

---

## OPTION 1 — Simplest: Share the HTML File Directly (No Server Needed)

This works immediately for a small team on the same network or via WhatsApp/email.

**Steps:**
1. Copy `index.html` to each person's laptop or phone
2. They open it in Chrome or Safari — it works offline
3. **Limitation:** Each device has its own separate data (no sharing between devices)

✅ Best for: Single-admin use (one person manages data, others just view printouts)

---

## OPTION 2 — Recommended: Host on a Local Network (LAN Server)

Everyone in the office accesses the same live data from their laptop or phone on the same Wi-Fi.

### What You Need
- One PC or laptop to act as the server (stays on during work hours)
- Node.js installed (free) — https://nodejs.org

### Step-by-Step Setup

#### Step 1 — Install Node.js
Go to https://nodejs.org → Download the **LTS version** → Install it

#### Step 2 — Create the Project Folder
```
C:\PrimePanelSystem\
  ├── index.html       ← the main app file
  ├── server.js        ← the server file (below)
  ├── db.json          ← auto-created, stores all data
  └── package.json     ← auto-created
```

#### Step 3 — Create server.js
Create a file called `server.js` and paste this code:

```javascript
const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT    = 3000;
const DB_FILE = path.join(__dirname, 'db.json');

// Make sure db.json exists
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ employees: [], transactions: [] }));
}

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // API: GET database
  if (req.method === 'GET' && req.url === '/api/db') {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(data);
    return;
  }

  // API: POST (save database)
  if (req.method === 'POST' && req.url === '/api/db') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        JSON.parse(body); // validate JSON
        fs.writeFileSync(DB_FILE, body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch(e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // Serve static files
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  if (!fs.existsSync(filePath)) {
    res.writeHead(404); res.end('Not found'); return;
  }
  const ext  = path.extname(filePath);
  const mime = MIME[ext] || 'text/plain';
  res.writeHead(200, { 'Content-Type': mime });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, '0.0.0.0', () => {
  // Print server IP addresses
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  console.log('\n✅ Prime Panel HR System is running!\n');
  console.log('Access on this machine:');
  console.log(`   http://localhost:${PORT}\n`);
  console.log('Access from other devices on the same Wi-Fi:');
  Object.values(nets).flat().filter(n => n.family==='IPv4' && !n.internal).forEach(n => {
    console.log(`   http://${n.address}:${PORT}`);
  });
  console.log('\nShare the http://... address with your team!');
  console.log('Press Ctrl+C to stop the server.\n');
});
```

#### Step 4 — Open Command Prompt and Run
```bash
cd C:\PrimePanelSystem
node server.js
```

You will see something like:
```
✅ Prime Panel HR System is running!

Access on this machine:
   http://localhost:3000

Access from other devices on the same Wi-Fi:
   http://192.168.1.45:3000
```

#### Step 5 — Share With Your Team
- Everyone on the same Wi-Fi goes to `http://192.168.1.45:3000` (use your actual IP)
- Works on phones, laptops, tablets — just open in any browser
- **All data is shared and synced in real time**

---

## OPTION 3 — Advanced: Host Online (Accessible from Anywhere)

If staff need to access from home or different locations.

### Using Render.com (Free Hosting)

1. Create account at https://render.com
2. Upload your project files to GitHub
3. Create a new **Web Service** on Render → point to your repo
4. Set start command: `node server.js`
5. Everyone accesses via the live URL Render gives you (e.g. `https://primepanel-hr.onrender.com`)

### Using a VPS (e.g. DigitalOcean, Linode ~$6/month)
```bash
# On the VPS:
git clone your-repo
cd primepanel
node server.js &    # run in background

# Use PM2 to keep it running
npm install -g pm2
pm2 start server.js --name primepanel
pm2 startup   # auto-start on reboot
```

---

## DATABASE FILE (db.json)

The database is a simple JSON file that looks like this:

```json
{
  "employees": [
    {
      "id": "abc123",
      "fn": "John",
      "ln": "Doe",
      "cat": "Director",
      "dept": "Management",
      "salary": 200000,
      "phone": "+254 712 345 678",
      "email": "john@primepanel.com",
      "nid": "12345678",
      "status": "Active",
      "edate": "2024-01-15"
    }
  ],
  "transactions": [
    {
      "id": "tx001",
      "eid": "abc123",
      "type": "salary",
      "amount": 200000,
      "month": "2025-03",
      "date": "2025-03-28",
      "note": "March salary",
      "status": "Paid"
    }
  ]
}
```

**Backup:** Simply copy `db.json` to a USB drive or Google Drive regularly.

---

## QUICK TROUBLESHOOTING

| Problem | Solution |
|---|---|
| "node is not recognized" | Re-install Node.js and restart Command Prompt |
| Other devices can't connect | Check Windows Firewall → allow port 3000 |
| Data not saving | Make sure `db.json` file is in the same folder as `server.js` |
| Page not loading | Make sure `node server.js` is still running |

---

## FIREWALL — Allow Port 3000 on Windows

If other devices can't connect, run this in Command Prompt as Administrator:
```
netsh advfirewall firewall add rule name="PrimePanelHR" dir=in action=allow protocol=TCP localport=3000
```

---

*Prime Panel Limited HR Accounts System — Setup Guide*
