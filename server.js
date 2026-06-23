/**
 * server.js — Serveur central Fiche Client
 * Sert les fichiers statiques + API REST pour données partagées
 * Stockage : data/db.json (fichier local sur le Mac)
 */

const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');
const os      = require('os');

const app     = express();
const PORT    = 3000;
const DB_FILE = path.join(__dirname, 'data', 'db.json');

// ─── Ensure data directory exists ────────────────────────────────────────────

if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

// ─── DB helpers (simple JSON file) ───────────────────────────────────────────

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    const defaultDB = {
      visitors: [],
      team: [],
      settings: { adminPassword: 'Admin123' },
      nextVisitorId: 1,
      nextTeamId: 1
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultDB, null, 2));
    return defaultDB;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── API : VISITORS ───────────────────────────────────────────────────────────

// GET all visitors
app.get('/api/visitors', (req, res) => {
  const db = readDB();
  res.json(db.visitors);
});

// POST add visitor
app.post('/api/visitors', (req, res) => {
  const db = readDB();
  const visitor = {
    ...req.body,
    id: db.nextVisitorId++,
    date: new Date().toISOString()
  };
  db.visitors.push(visitor);
  writeDB(db);
  res.status(201).json(visitor);
});

// DELETE visitor
app.delete('/api/visitors/:id', (req, res) => {
  const db = readDB();
  const id = parseInt(req.params.id);
  db.visitors = db.visitors.filter(v => v.id !== id);
  writeDB(db);
  res.json({ ok: true });
});

// ─── API : TEAM ───────────────────────────────────────────────────────────────

// GET all team members
app.get('/api/team', (req, res) => {
  const db = readDB();
  res.json(db.team);
});

// POST add team member
app.post('/api/team', (req, res) => {
  const db = readDB();
  const member = { ...req.body, id: db.nextTeamId++ };
  db.team.push(member);
  writeDB(db);
  res.status(201).json(member);
});

// DELETE team member
app.delete('/api/team/:id', (req, res) => {
  const db = readDB();
  const id = parseInt(req.params.id);
  db.team = db.team.filter(m => m.id !== id);
  writeDB(db);
  res.json({ ok: true });
});

// ─── API : SETTINGS ───────────────────────────────────────────────────────────

app.get('/api/settings/:key', (req, res) => {
  const db = readDB();
  res.json({ value: db.settings[req.params.key] ?? null });
});

app.put('/api/settings/:key', (req, res) => {
  const db = readDB();
  db.settings[req.params.key] = req.body.value;
  writeDB(db);
  res.json({ ok: true });
});

// ─── SPA Fallback ─────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
  // Get local IP addresses
  const interfaces = os.networkInterfaces();
  const localIPs = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        localIPs.push(iface.address);
      }
    }
  }

  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║         🏢  FICHE CLIENT — Serveur Central               ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║                                                          ║');
  console.log('║  Sur ce Mac :       http://localhost:' + PORT + '              ║');
  localIPs.forEach(ip => {
    const padded = ('http://' + ip + ':' + PORT).padEnd(44);
    console.log('║  Sur téléphones :   ' + padded + ' ║');
  });
  console.log('║                                                          ║');
  console.log('║  ✅ Données stockées dans : data/db.json                  ║');
  console.log('║  ✅ Tous les appareils partagent la MÊME base             ║');
  console.log('║                                                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('\n  ⚠️  Gardez cette fenêtre ouverte pendant tout le showroom\n');
});
