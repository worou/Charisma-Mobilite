const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ── Database ──────────────────────────────────────────────────────────────────
const db = new Database(path.join(__dirname, 'charisma_move.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    first_name TEXT,
    gender     TEXT,
    email      TEXT NOT NULL UNIQUE,
    password   TEXT NOT NULL,
    phone      TEXT,
    is_admin   INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS items (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    departure   TEXT,
    arrival     TEXT,
    travel_date TEXT,
    travel_time TEXT,
    seats       INTEGER,
    price       REAL DEFAULT 0,
    status      TEXT DEFAULT 'pending',
    created_at  TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS announcements (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    departure   TEXT NOT NULL,
    destination TEXT NOT NULL,
    datetime    TEXT NOT NULL,
    seats       INTEGER NOT NULL,
    price       REAL,
    description TEXT,
    created_at  TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Bus de l'Église : l'admin crée les lignes, les places sont comptées par date de culte
db.exec(`
  CREATE TABLE IF NOT EXISTS bus_lines (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL UNIQUE,
    seats      INTEGER NOT NULL CHECK (seats > 0),
    active     INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bus_bookings (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    line_id      INTEGER NOT NULL,
    user_id      INTEGER NOT NULL,
    service_date TEXT NOT NULL,
    seats        INTEGER NOT NULL CHECK (seats > 0),
    created_at   TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (line_id) REFERENCES bus_lines(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_bus_bookings_line_date ON bus_bookings(line_id, service_date);

  CREATE TABLE IF NOT EXISTS notifications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    title      TEXT NOT NULL,
    message    TEXT NOT NULL,
    is_read    INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// CREATE TABLE IF NOT EXISTS n'ajoute pas de colonne à une base déjà créée :
// on rattache les réservations au trajet réservé par une migration explicite.
if (!db.prepare('PRAGMA table_info(bookings)').all().some(c => c.name === 'announcement_id')) {
  db.exec('ALTER TABLE bookings ADD COLUMN announcement_id INTEGER REFERENCES announcements(id)');
  console.log('Migration : bookings.announcement_id ajouté');
}

// Seed default admin
const adminCount = db.prepare('SELECT COUNT(*) as c FROM users WHERE is_admin = 1').get();
if (adminCount.c === 0) {
  const email    = process.env.ADMIN_EMAIL    || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const name     = process.env.ADMIN_NAME     || 'Admin';
  const hash     = bcrypt.hashSync(password, 12);
  db.prepare('INSERT INTO users (name, email, password, is_admin) VALUES (?, ?, ?, 1)').run(name, email, hash);
  console.log(`Admin créé: ${email}`);
}
console.log('Base de données SQLite prête');

// ── Auth middleware ───────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

function authenticateAdmin(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err || !user.is_admin) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  });
}

// ── Items ─────────────────────────────────────────────────────────────────────
app.get('/api/items', (req, res) => {
  const { q } = req.query;
  const rows = q
    ? db.prepare('SELECT id, name FROM items WHERE LOWER(name) LIKE ?').all(`%${q.toLowerCase()}%`)
    : db.prepare('SELECT id, name FROM items').all();
  res.json(rows);
});

app.post('/api/items', (req, res) => {
  const result = db.prepare('INSERT INTO items (name) VALUES (?)').run(req.body.name);
  res.status(201).json({ id: result.lastInsertRowid, name: req.body.name });
});

// ── User auth ─────────────────────────────────────────────────────────────────
app.post('/api/users/register', async (req, res) => {
  const { name, first_name, gender, email, password, phone } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
    return res.status(409).json({ error: 'Email already in use' });
  }
  const hash   = await bcrypt.hash(password, 10);
  const result = db.prepare(
    'INSERT INTO users (name, first_name, gender, email, password, phone) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, first_name || null, gender || null, email, hash, phone || null);
  res.status(201).json({ id: result.lastInsertRowid, name, first_name, gender, email, phone, is_admin: false });
});

app.post(['/api/users/login', '/api/auth/login'], async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id, is_admin: !!user.is_admin }, JWT_SECRET, { expiresIn: '1h' });
  res.json({
    token,
    user: { id: user.id, name: user.name, first_name: user.first_name, gender: user.gender, email: user.email, phone: user.phone, is_admin: !!user.is_admin },
  });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, name, first_name, gender, email, phone, is_admin FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

// ── OAuth (Google, GitHub) ────────────────────────────────────────────────────
// Le navigateur passe par le proxy Vite : les URL de callback sont donc sur FRONTEND_URL.
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const OAUTH_PROVIDERS = {
  google: {
    label:        'Google',
    clientId:    process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl:     'https://oauth2.googleapis.com/token',
    scope:        'openid email profile',
    async fetchProfile(accessToken) {
      const r = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!r.ok) throw new Error('Profil Google inaccessible');
      const p = await r.json();
      if (!p.email || !p.email_verified) throw new Error('Email Google non vérifié');
      return { email: p.email, name: p.family_name || p.name || p.email, first_name: p.given_name || null };
    },
  },
  github: {
    label:        'GitHub',
    clientId:    process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl:     'https://github.com/login/oauth/access_token',
    scope:        'read:user user:email',
    async fetchProfile(accessToken) {
      const headers = { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'charisma-move', Accept: 'application/vnd.github+json' };
      const [userRes, emailsRes] = await Promise.all([
        fetch('https://api.github.com/user', { headers }),
        fetch('https://api.github.com/user/emails', { headers }),
      ]);
      if (!userRes.ok || !emailsRes.ok) throw new Error('Profil GitHub inaccessible');
      const p = await userRes.json();
      const primary = (await emailsRes.json()).find(e => e.primary && e.verified);
      if (!primary) throw new Error('Aucun email GitHub vérifié');
      return { email: primary.email, name: p.name || p.login, first_name: null };
    },
  },
};

const oauthCallbackUrl = (provider) => `${FRONTEND_URL}/api/auth/${provider}/callback`;
const oauthFail = (res, message) => res.redirect(`${FRONTEND_URL}/#oauth_error=${encodeURIComponent(message)}`);
const readCookie = (req, name) =>
  (req.headers.cookie || '').split(';').map(c => c.trim().split('=')).find(([k]) => k === name)?.[1];

app.get('/api/auth/:provider', (req, res, next) => {
  const cfg = OAUTH_PROVIDERS[req.params.provider];
  if (!cfg) return next();
  if (!cfg.clientId || !cfg.clientSecret) return oauthFail(res, `Connexion ${cfg.label} non configurée`);
  // state anti-CSRF : aléatoire, gardé en cookie httpOnly et comparé au retour
  const state = crypto.randomBytes(16).toString('hex');
  res.setHeader('Set-Cookie', `oauth_state=${state}; HttpOnly; SameSite=Lax; Path=/api/auth; Max-Age=600`);
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: oauthCallbackUrl(req.params.provider),
    response_type: 'code',
    scope: cfg.scope,
    state,
  });
  res.redirect(`${cfg.authorizeUrl}?${params}`);
});

app.get('/api/auth/:provider/callback', async (req, res, next) => {
  const provider = req.params.provider;
  const cfg = OAUTH_PROVIDERS[provider];
  if (!cfg) return next();
  const { code, state } = req.query;
  const expectedState = readCookie(req, 'oauth_state');
  res.setHeader('Set-Cookie', 'oauth_state=; HttpOnly; SameSite=Lax; Path=/api/auth; Max-Age=0');
  if (!code || !state || state !== expectedState) return oauthFail(res, 'Connexion annulée ou expirée');

  try {
    const tokenRes = await fetch(cfg.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        code,
        redirect_uri: oauthCallbackUrl(provider),
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error('Échange du code refusé');

    const profile = await cfg.fetchProfile(tokenData.access_token);
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(profile.email);
    if (!user) {
      // Mot de passe aléatoire inutilisable : la colonne est NOT NULL, le compte se connecte via OAuth
      const hash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
      const result = db.prepare('INSERT INTO users (name, first_name, email, password) VALUES (?, ?, ?, ?)')
        .run(profile.name, profile.first_name, profile.email, hash);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    }
    const token = jwt.sign({ id: user.id, is_admin: !!user.is_admin }, JWT_SECRET, { expiresIn: '1h' });
    // Fragment (#) : le jeton n'est envoyé à aucun serveur ni journalisé
    res.redirect(`${FRONTEND_URL}/#oauth_token=${token}`);
  } catch (err) {
    console.error(`OAuth ${provider}:`, err.message);
    oauthFail(res, err.message);
  }
});

app.get('/api/users/:id', authenticateToken, (req, res) => {
  if (parseInt(req.params.id) !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  const user = db.prepare('SELECT id, name, first_name, gender, email, phone, is_admin FROM users WHERE id = ?').get(req.user.id);
  res.json(user || {});
});

app.put('/api/users/:id', authenticateToken, (req, res) => {
  if (parseInt(req.params.id) !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  const { name, first_name, gender, phone } = req.body;
  db.prepare('UPDATE users SET name = COALESCE(?, name), first_name = COALESCE(?, first_name), gender = COALESCE(?, gender), phone = COALESCE(?, phone) WHERE id = ?')
    .run(name, first_name, gender, phone, req.user.id);
  const user = db.prepare('SELECT id, name, first_name, gender, email, phone, is_admin FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

// ── Admin: login ──────────────────────────────────────────────────────────────
app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_admin = 1').get(email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id, is_admin: true }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, admin: { id: user.id, name: user.name, email: user.email } });
});

// ── Admin: users ──────────────────────────────────────────────────────────────
app.get('/api/admin/users', authenticateAdmin, (req, res) => {
  res.json(db.prepare('SELECT id, name, first_name, email, phone, is_admin FROM users ORDER BY id ASC').all());
});

app.post('/api/admin/users', authenticateAdmin, async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
  if (password.length < 8) return res.status(400).json({ error: 'Password too short' });
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
    return res.status(409).json({ error: 'Email already in use' });
  }
  const hash = await bcrypt.hash(password, 12);
  let result;
  try {
    result = db.prepare(
      'INSERT INTO users (name, email, password, phone, is_admin) VALUES (?, ?, ?, ?, 1)'
    ).run(name, email, hash, phone || null);
  } catch (e) {
    // email est UNIQUE : rattrape la collision entre le pré-contrôle et l'insertion
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'Email already in use' });
    throw e;
  }
  res.status(201).json({ id: result.lastInsertRowid, name, email, phone: phone || null, is_admin: true });
});

app.delete('/api/admin/users/:id', authenticateAdmin, (req, res) => {
  db.prepare('DELETE FROM users WHERE id = ? AND is_admin = 0').run(req.params.id);
  res.json({ success: true });
});

// ── Admin: stats ──────────────────────────────────────────────────────────────
app.get('/api/admin/stats', authenticateAdmin, (req, res) => {
  const total_users    = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const total_trips    = db.prepare('SELECT COUNT(*) as c FROM announcements').get().c;
  const total_bookings = db.prepare('SELECT COUNT(*) as c FROM bookings').get().c;
  const active_trips   = db.prepare("SELECT COUNT(*) as c FROM announcements WHERE datetime > datetime('now')").get().c;
  res.json({ total_users, total_trips, total_bookings, active_trips });
});

// ── Admin: announcements ──────────────────────────────────────────────────────
app.get('/api/admin/announcements', authenticateAdmin, (req, res) => {
  res.json(db.prepare(`
    SELECT a.*, u.name as driver_name, u.email as driver_email
    FROM announcements a JOIN users u ON a.user_id = u.id
    ORDER BY a.datetime DESC
  `).all());
});

app.delete('/api/admin/announcements/:id', authenticateAdmin, (req, res) => {
  db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── Admin: bookings ───────────────────────────────────────────────────────────
app.get('/api/admin/bookings', authenticateAdmin, (req, res) => {
  res.json(db.prepare(`
    SELECT b.*, u.name as user_name, u.email as user_email
    FROM bookings b JOIN users u ON b.user_id = u.id
    ORDER BY b.created_at DESC
  `).all());
});

// ── Announcements ─────────────────────────────────────────────────────────────
app.post('/api/announcements', authenticateToken, (req, res) => {
  const { departure, destination, datetime, description } = req.body;
  const seats = parseInt(req.body.seats);
  if (!departure?.trim() || !destination?.trim() || !datetime || !seats) return res.status(400).json({ error: 'Missing fields' });
  if (seats < 1 || seats > 8) return res.status(400).json({ error: 'Le nombre de places doit être entre 1 et 8' });
  if (new Date(datetime) <= new Date()) return res.status(400).json({ error: 'La date de départ doit être dans le futur' });
  // Token encore valide mais compte supprimé : sinon la contrainte FOREIGN KEY fait planter l'INSERT
  if (!db.prepare('SELECT 1 FROM users WHERE id = ?').get(req.user.id)) {
    return res.status(401).json({ error: 'User not found' });
  }
  // Le covoiturage est gratuit : aucun prix n'est enregistré
  const result = db.prepare(
    'INSERT INTO announcements (user_id, departure, destination, datetime, seats, description) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(req.user.id, departure.trim(), destination.trim(), datetime, seats, description?.trim() || null);
  res.status(201).json({ id: result.lastInsertRowid, departure, destination, datetime, seats, description });
});

// Trajets publiés par l'utilisateur connecté, avec les places déjà réservées
app.get('/api/announcements/mine', authenticateToken, (req, res) => {
  res.json(db.prepare(`
    SELECT a.id, a.departure, a.destination, a.datetime, a.seats, a.description, a.created_at,
           COALESCE((SELECT SUM(b.seats) FROM bookings b WHERE b.announcement_id = a.id), 0) AS booked_seats
    FROM announcements a
    WHERE a.user_id = ?
    ORDER BY a.datetime DESC
  `).all(req.user.id));
});

app.get('/api/announcements', (req, res) => {
  // route publique : on expose le nom du conducteur, jamais son email ni son user_id
  let query = `
    SELECT a.id, a.departure, a.destination, a.datetime, a.seats, a.price, a.description, u.name AS driver_name
    FROM announcements a JOIN users u ON a.user_id = u.id
    WHERE 1=1`;
  const params = [];
  if (req.query.departure)   { query += ' AND LOWER(a.departure) LIKE ?';   params.push(`%${req.query.departure.toLowerCase()}%`); }
  if (req.query.destination) { query += ' AND LOWER(a.destination) LIKE ?'; params.push(`%${req.query.destination.toLowerCase()}%`); }
  if (req.query.seats)       { query += ' AND a.seats >= ?';                params.push(parseInt(req.query.seats)); }
  if (req.query.date)        { query += ' AND date(a.datetime) = ?';        params.push(req.query.date); }
  query += ' ORDER BY a.datetime ASC';
  res.json(db.prepare(query).all(...params));
});

// ── Bookings ──────────────────────────────────────────────────────────────────
// Réserver décrémente les places restantes du trajet. Les colonnes à plat
// (departure/arrival/travel_date/travel_time) sont dérivées du trajet et non
// envoyées par le client : MyBookingsPage et l'admin les lisent encore.
const bookSeats = db.transaction((userId, announcementId, seats) => {
  const trip = db.prepare('SELECT * FROM announcements WHERE id = ?').get(announcementId);
  if (!trip) return { error: 'Trip not found', status: 404 };
  if (seats > trip.seats) return { error: 'Not enough seats', status: 409, available: trip.seats };

  const [travel_date, travel_time] = String(trip.datetime).split('T');
  db.prepare('UPDATE announcements SET seats = seats - ? WHERE id = ?').run(seats, announcementId);
  const result = db.prepare(
    'INSERT INTO bookings (user_id, announcement_id, departure, arrival, travel_date, travel_time, seats, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(userId, announcementId, trip.departure, trip.destination, travel_date, travel_time || null, seats, trip.price || 0);

  return {
    booking: {
      id: result.lastInsertRowid,
      announcement_id: announcementId,
      departure: trip.departure,
      arrival: trip.destination,
      travel_date,
      travel_time: travel_time || null,
      seats,
      price: trip.price || 0,
      status: 'pending',
    },
    seats_left: trip.seats - seats,
  };
});

app.post('/api/bookings', authenticateToken, (req, res) => {
  const announcement_id = parseInt(req.body.announcement_id);
  const seats = parseInt(req.body.seats);
  if (!announcement_id) return res.status(400).json({ error: 'Missing announcement_id' });
  if (!seats || seats < 1) return res.status(400).json({ error: 'Invalid seats' });

  const out = bookSeats(req.user.id, announcement_id, seats);
  if (out.error) return res.status(out.status).json({ error: out.error, available: out.available });
  res.status(201).json({ ...out.booking, seats_left: out.seats_left });
});

app.get('/api/bookings', authenticateToken, (req, res) => {
  res.json(db.prepare(
    'SELECT id, departure, arrival, travel_date, travel_time, seats, price, status, created_at FROM bookings WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.user.id));
});

// Ne touche pas aux places : elles sont déjà déduites à la création de la réservation.
// L'admin confirme n'importe quelle réservation (AdminBookings), un utilisateur
// seulement les siennes.
app.post('/api/bookings/:id/confirm', authenticateToken, (req, res) => {
  const result = req.user.is_admin
    ? db.prepare("UPDATE bookings SET status = 'confirmed' WHERE id = ?").run(req.params.id)
    : db.prepare("UPDATE bookings SET status = 'confirmed' WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Booking not found' });
  res.json({ success: true });
});

// Annuler rend les places au trajet, sinon elles seraient perdues définitivement.
const cancelBooking = db.transaction((bookingId, userId) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ? AND user_id = ?').get(bookingId, userId);
  if (!booking) return { deleted: false };
  db.prepare('DELETE FROM bookings WHERE id = ?').run(bookingId);
  if (booking.announcement_id) {
    db.prepare('UPDATE announcements SET seats = seats + ? WHERE id = ?').run(booking.seats, booking.announcement_id);
  }
  return { deleted: true };
});

app.delete('/api/bookings/:id', authenticateToken, (req, res) => {
  const { deleted } = cancelBooking(parseInt(req.params.id), req.user.id);
  if (!deleted) return res.status(404).json({ error: 'Booking not found' });
  res.json({ success: true });
});

// ── Notifications ─────────────────────────────────────────────────────────────
// Email facultatif : sans SMTP_HOST, la notification reste visible dans le site uniquement.
const mailer = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    })
  : null;

function notifyUser(userId, title, message) {
  db.prepare('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)').run(userId, title, message);
  const user = db.prepare('SELECT email, first_name, name FROM users WHERE id = ?').get(userId);
  if (!mailer || !user) return;
  // Envoi en arrière-plan : un échec SMTP ne doit pas bloquer la réponse au voyageur
  mailer.sendMail({
    from: process.env.FROM_EMAIL || process.env.SMTP_USER,
    to: user.email,
    subject: `Charisma'Move – ${title}`,
    text: `Bonjour ${user.first_name || user.name},\n\n${message}\n\nL'équipe Charisma'Move`,
  }).catch(err => console.error('Email non envoyé :', err.message));
}

app.get('/api/notifications', authenticateToken, (req, res) => {
  res.json(db.prepare(
    'SELECT id, title, message, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 50'
  ).all(req.user.id));
});

app.post('/api/notifications/read', authenticateToken, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ success: true });
});

// ── Bus de l'Église ───────────────────────────────────────────────────────────
const isServiceDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d || '') && !isNaN(new Date(d));
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const formatServiceDate = (d) =>
  new Date(`${d}T12:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const reservedSeats = (lineId, date) =>
  db.prepare('SELECT COALESCE(SUM(seats), 0) AS n FROM bus_bookings WHERE line_id = ? AND service_date = ?').get(lineId, date).n;

// Lignes actives et places restantes pour une date donnée
app.get('/api/bus-lines', (req, res) => {
  const date = isServiceDate(req.query.date) ? req.query.date : null;
  const lines = db.prepare('SELECT id, name, seats FROM bus_lines WHERE active = 1 ORDER BY name').all();
  res.json(lines.map(l => {
    const reserved = date ? reservedSeats(l.id, date) : 0;
    return { ...l, reserved, available: Math.max(l.seats - reserved, 0) };
  }));
});

// Vérification et insertion dans la même transaction : deux réservations simultanées ne peuvent pas dépasser la capacité
const bookBus = db.transaction((userId, lineId, date, seats) => {
  const line = db.prepare('SELECT * FROM bus_lines WHERE id = ? AND active = 1').get(lineId);
  if (!line) return { status: 404, error: 'Ligne introuvable' };
  const available = Math.max(line.seats - reservedSeats(lineId, date), 0);
  if (seats > available) return { status: 409, full: true, line, available };
  const result = db.prepare('INSERT INTO bus_bookings (line_id, user_id, service_date, seats) VALUES (?, ?, ?, ?)')
    .run(lineId, userId, date, seats);
  return { booking: { id: result.lastInsertRowid, line_id: lineId, line_name: line.name, service_date: date, seats }, available: available - seats };
});

app.post('/api/bus-bookings', authenticateToken, (req, res) => {
  const lineId = parseInt(req.body.line_id);
  const seats = parseInt(req.body.seats);
  const date = req.body.date;
  if (!lineId || !seats || seats < 1) return res.status(400).json({ error: 'Ligne et nombre de places requis' });
  if (!isServiceDate(date)) return res.status(400).json({ error: 'Date invalide' });
  if (date < todayLocal()) return res.status(400).json({ error: 'La date doit être aujourd\'hui ou plus tard' });
  if (!db.prepare('SELECT 1 FROM users WHERE id = ?').get(req.user.id)) return res.status(401).json({ error: 'User not found' });

  const result = bookBus(req.user.id, lineId, date, seats);
  if (result.full) {
    const message = result.available === 0
      ? `Il n'y a plus de places disponibles sur la ligne « ${result.line.name} » pour le ${formatServiceDate(date)}.`
      : `Il ne reste que ${result.available} place(s) sur la ligne « ${result.line.name} » pour le ${formatServiceDate(date)} : votre demande de ${seats} place(s) n'a pas pu être enregistrée.`;
    notifyUser(req.user.id, 'Plus de places disponibles', message);
    return res.status(409).json({ error: message, available: result.available });
  }
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.status(201).json(result);
});

app.get('/api/bus-bookings', authenticateToken, (req, res) => {
  res.json(db.prepare(`
    SELECT b.id, b.service_date, b.seats, b.created_at, l.name AS line_name
    FROM bus_bookings b JOIN bus_lines l ON b.line_id = l.id
    WHERE b.user_id = ?
    ORDER BY b.service_date DESC
  `).all(req.user.id));
});

app.delete('/api/bus-bookings/:id', authenticateToken, (req, res) => {
  const result = db.prepare('DELETE FROM bus_bookings WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Booking not found' });
  res.json({ success: true });
});

// ── Admin: bus ────────────────────────────────────────────────────────────────
app.get('/api/admin/bus-lines', authenticateAdmin, (req, res) => {
  const lines = db.prepare('SELECT * FROM bus_lines ORDER BY name').all();
  const upcoming = db.prepare(`
    SELECT service_date, SUM(seats) AS reserved, COUNT(*) AS bookings
    FROM bus_bookings WHERE line_id = ? AND service_date >= ?
    GROUP BY service_date ORDER BY service_date
  `);
  const today = todayLocal();
  res.json(lines.map(l => ({ ...l, active: !!l.active, upcoming: upcoming.all(l.id, today) })));
});

const validateLine = ({ name, seats }) => {
  if (!name?.trim()) return 'Le nom de la ligne est requis';
  if (!Number.isInteger(seats) || seats < 1 || seats > 500) return 'Le nombre de places doit être entre 1 et 500';
  return null;
};

app.post('/api/admin/bus-lines', authenticateAdmin, (req, res) => {
  const name = req.body.name?.trim();
  const seats = parseInt(req.body.seats);
  const invalid = validateLine({ name, seats });
  if (invalid) return res.status(400).json({ error: invalid });
  if (db.prepare('SELECT 1 FROM bus_lines WHERE name = ?').get(name)) return res.status(409).json({ error: 'Une ligne porte déjà ce nom' });
  const result = db.prepare('INSERT INTO bus_lines (name, seats) VALUES (?, ?)').run(name, seats);
  res.status(201).json({ id: result.lastInsertRowid, name, seats, active: true, upcoming: [] });
});

app.put('/api/admin/bus-lines/:id', authenticateAdmin, (req, res) => {
  const line = db.prepare('SELECT * FROM bus_lines WHERE id = ?').get(req.params.id);
  if (!line) return res.status(404).json({ error: 'Ligne introuvable' });
  const name = req.body.name !== undefined ? req.body.name?.trim() : line.name;
  const seats = req.body.seats !== undefined ? parseInt(req.body.seats) : line.seats;
  const active = req.body.active !== undefined ? (req.body.active ? 1 : 0) : line.active;
  const invalid = validateLine({ name, seats });
  if (invalid) return res.status(400).json({ error: invalid });
  if (db.prepare('SELECT 1 FROM bus_lines WHERE name = ? AND id != ?').get(name, line.id)) {
    return res.status(409).json({ error: 'Une ligne porte déjà ce nom' });
  }
  // On ne peut pas descendre sous les places déjà réservées pour un culte à venir
  const maxReserved = db.prepare(`
    SELECT COALESCE(MAX(total), 0) AS n FROM (
      SELECT SUM(seats) AS total FROM bus_bookings WHERE line_id = ? AND service_date >= ? GROUP BY service_date
    )`).get(line.id, todayLocal()).n;
  if (seats < maxReserved) {
    return res.status(409).json({ error: `Impossible : ${maxReserved} places sont déjà réservées pour un culte à venir` });
  }
  db.prepare('UPDATE bus_lines SET name = ?, seats = ?, active = ? WHERE id = ?').run(name, seats, active, line.id);
  res.json({ id: line.id, name, seats, active: !!active });
});

app.delete('/api/admin/bus-lines/:id', authenticateAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM bus_lines WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Ligne introuvable' });
  res.json({ success: true });
});

app.get('/api/admin/bus-bookings', authenticateAdmin, (req, res) => {
  let query = `
    SELECT b.id, b.line_id, b.service_date, b.seats, b.created_at, l.name AS line_name,
           u.name AS user_name, u.first_name AS user_first_name, u.email AS user_email, u.phone AS user_phone
    FROM bus_bookings b JOIN bus_lines l ON b.line_id = l.id JOIN users u ON b.user_id = u.id
    WHERE 1=1`;
  const params = [];
  if (req.query.line_id) { query += ' AND b.line_id = ?'; params.push(parseInt(req.query.line_id)); }
  if (isServiceDate(req.query.date)) { query += ' AND b.service_date = ?'; params.push(req.query.date); }
  query += ' ORDER BY b.service_date DESC, l.name, b.created_at';
  res.json(db.prepare(query).all(...params));
});

app.delete('/api/admin/bus-bookings/:id', authenticateAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM bus_bookings WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Booking not found' });
  res.json({ success: true });
});

// ── Transports en commun vers l'Église (Île-de-France Mobilités / PRIM) ──────
// Géocodage : Géoplateforme IGN (gratuit, sans clé). Itinéraires : calculateur Navitia de PRIM (clé gratuite requise).
const GEOCODE_URL = 'https://data.geopf.fr/geocodage/search';
const PRIM_JOURNEYS_URL = process.env.PRIM_JOURNEYS_URL || 'https://prim.iledefrance-mobilites.fr/marketplace/v2/navitia/journeys';
const CHURCH_ADDRESS = process.env.CHURCH_ADDRESS;
const CHURCH_NAME = process.env.CHURCH_NAME || 'Église Charisma';
const IDF_DEPARTMENTS = new Set(['75', '77', '78', '91', '92', '93', '94', '95']);

async function geocode(q, { limit = 5, autocomplete = false } = {}) {
  // On demande plus de résultats pour garder en priorité ceux d'Île-de-France (le réseau couvert par PRIM)
  const params = new URLSearchParams({ q, limit: '20', index: 'address' });
  if (autocomplete) params.set('autocomplete', '1');
  const r = await fetch(`${GEOCODE_URL}?${params}`);
  if (!r.ok) throw new Error('Service d\'adresses indisponible');
  const data = await r.json();
  const places = data.features.map(f => ({
    label: f.properties.label,
    lon: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
    idf: IDF_DEPARTMENTS.has(String(f.properties.citycode || '').slice(0, 2)),
  }));
  const idf = places.filter(p => p.idf);
  return (idf.length ? idf : places).slice(0, limit).map(({ idf: _, ...p }) => p);
}

// Coordonnées de l'Église calculées une seule fois
let churchPlace = null;
async function getChurch() {
  if (churchPlace) return churchPlace;
  if (!CHURCH_ADDRESS) return null;
  const [place] = await geocode(CHURCH_ADDRESS, { limit: 1 });
  if (place) churchPlace = { ...place, name: CHURCH_NAME };
  return churchPlace;
}

app.get('/api/transit/config', async (req, res) => {
  try {
    const church = await getChurch();
    res.json({ church, enabled: !!(church && process.env.PRIM_API_KEY) });
  } catch {
    res.json({ church: null, enabled: false });
  }
});

app.get('/api/transit/address', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 3) return res.json([]);
  try {
    res.json(await geocode(q, { autocomplete: true }));
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// "20261011T093000" -> "2026-10-11T09:30:00" (heure locale de Paris, renvoyée telle quelle)
const navitiaDate = (s) => s && `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}`;

const simplifySection = (s) => {
  const base = {
    type: s.type,
    duration: s.duration,
    departure: navitiaDate(s.departure_date_time),
    arrival: navitiaDate(s.arrival_date_time),
    from: s.from?.name || null,
    to: s.to?.name || null,
  };
  if (s.type === 'public_transport') {
    const d = s.display_informations || {};
    return {
      ...base,
      mode: d.physical_mode || d.commercial_mode,
      line: d.code || d.label,
      color: d.color ? `#${d.color}` : null,
      text_color: d.text_color ? `#${d.text_color}` : null,
      direction: d.direction,
      network: d.network,
      stops: Math.max((s.stop_date_times?.length || 1) - 1, 0),
    };
  }
  if (s.type === 'street_network' || s.type === 'crow_fly') return { ...base, mode: s.mode };
  return base;
};

app.get('/api/transit/journey', async (req, res) => {
  const lon = parseFloat(req.query.lon);
  const lat = parseFloat(req.query.lat);
  const { date, time } = req.query; // date AAAA-MM-JJ, time HH:MM = heure d'arrivée souhaitée à l'Église
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return res.status(400).json({ error: 'Adresse de départ invalide' });
  if (!isServiceDate(date) || !/^\d{2}:\d{2}$/.test(time || '')) return res.status(400).json({ error: 'Date ou heure invalide' });
  if (!process.env.PRIM_API_KEY) return res.status(503).json({ error: 'Le calcul d\'itinéraire n\'est pas encore configuré' });

  try {
    const church = await getChurch();
    if (!church) return res.status(503).json({ error: 'L\'adresse de l\'Église n\'est pas configurée' });

    const params = new URLSearchParams({
      from: `${lon};${lat}`,
      to: `${church.lon};${church.lat}`,
      datetime: `${date.replace(/-/g, '')}T${time.replace(':', '')}00`,
      datetime_represents: 'arrival',
      count: '3',
    });
    const r = await fetch(`${PRIM_JOURNEYS_URL}?${params}`, { headers: { apikey: process.env.PRIM_API_KEY } });
    const data = await r.json().catch(() => ({}));
    if (r.status === 401 || r.status === 403) {
      console.error('PRIM : clé refusée');
      return res.status(502).json({ error: 'Service d\'itinéraires indisponible (clé API refusée)' });
    }
    // Navitia ajoute toujours un trajet « tout à pied », absurde au-delà d'une demi-heure
    data.journeys = (data.journeys || []).filter(j =>
      j.sections.some(s => s.type === 'public_transport') || j.duration <= 30 * 60
    );
    if (!data.journeys.length) {
      const message = data.error?.id === 'date_out_of_bounds'
        ? 'Les horaires ne sont pas encore disponibles pour cette date'
        : 'Aucun itinéraire trouvé depuis cette adresse';
      return res.status(404).json({ error: message });
    }
    res.json({
      church,
      journeys: data.journeys.map(j => ({
        departure: navitiaDate(j.departure_date_time),
        arrival: navitiaDate(j.arrival_date_time),
        duration: j.duration,
        transfers: j.nb_transfers,
        walking: j.durations?.walking || 0,
        co2: j.co2_emission?.value ?? null,
        sections: j.sections.filter(s => s.type !== 'waiting' || s.duration > 0).map(simplifySection),
      })),
    });
  } catch (err) {
    console.error('Itinéraire :', err.message);
    res.status(502).json({ error: 'Service d\'itinéraires indisponible' });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));
