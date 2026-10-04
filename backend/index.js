require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require('./db');
const { initSchema } = require('./schema');

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

// Express 4 ne relaie pas les erreurs des handlers async : sans ce relais, une erreur
// MySQL deviendrait une promesse rejetée non gérée, qui arrête le processus Node.
for (const method of ['get', 'post', 'put', 'delete']) {
  const register = app[method].bind(app);
  app[method] = (path, ...handlers) => {
    if (handlers.length === 0) return register(path); // app.get('réglage')
    return register(path, ...handlers.map((h) => (req, res, next) => {
      try {
        const out = h(req, res, next);
        if (out && typeof out.catch === 'function') out.catch(next);
      } catch (err) {
        next(err);
      }
    }));
  };
}

// ── Database ──────────────────────────────────────────────────────────────────
async function initDatabase() {
  await initSchema(db);

  // Seed default admin
  const adminCount = await db.get('SELECT COUNT(*) as c FROM users WHERE is_admin = 1');
  if (adminCount.c === 0) {
    const email    = process.env.ADMIN_EMAIL    || 'admin@example.com';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const name     = process.env.ADMIN_NAME     || 'Admin';
    const hash     = await bcrypt.hash(password, 12);
    await db.run('INSERT INTO users (name, email, password, is_admin) VALUES (?, ?, ?, 1)', name, email, hash);
    console.log(`Admin créé: ${email}`);
  }
  console.log('Base de données MySQL prête');
}

// Date et heure locales au format des trajets (« AAAA-MM-JJTHH:MM »)
const pad2 = (n) => String(n).padStart(2, '0');
const nowLocalMinute = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};


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
app.get('/api/items', async (req, res) => {
  const { q } = req.query;
  const rows = q
    ? await db.all('SELECT id, name FROM items WHERE LOWER(name) LIKE ?', `%${q.toLowerCase()}%`)
    : await db.all('SELECT id, name FROM items');
  res.json(rows);
});

app.post('/api/items', async (req, res) => {
  const result = await db.run('INSERT INTO items (name) VALUES (?)', req.body.name);
  res.status(201).json({ id: result.lastInsertRowid, name: req.body.name });
});

// ── User auth ─────────────────────────────────────────────────────────────────
app.post('/api/users/register', async (req, res) => {
  const { name, first_name, gender, email, password, phone } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
  if (await db.get('SELECT id FROM users WHERE email = ?', email)) {
    return res.status(409).json({ error: 'Email already in use' });
  }
  const hash   = await bcrypt.hash(password, 10);
  const result = await db.run('INSERT INTO users (name, first_name, gender, email, password, phone) VALUES (?, ?, ?, ?, ?, ?)', name, first_name || null, gender || null, email, hash, phone || null);
  res.status(201).json({ id: result.lastInsertRowid, name, first_name, gender, email, phone, is_admin: false });
});

app.post(['/api/users/login', '/api/auth/login'], async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  const user = await db.get('SELECT * FROM users WHERE email = ?', email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id, is_admin: !!user.is_admin }, JWT_SECRET, { expiresIn: '1h' });
  res.json({
    token,
    user: { id: user.id, name: user.name, first_name: user.first_name, gender: user.gender, email: user.email, phone: user.phone, is_admin: !!user.is_admin },
  });
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  const user = await db.get('SELECT id, name, first_name, gender, email, phone, is_admin FROM users WHERE id = ?', req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

// ── OAuth (Google, GitHub) ────────────────────────────────────────────────────
// Le navigateur passe par le proxy Vite : les URL de callback sont donc sur FRONTEND_URL.
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
// URL publique de l'API (callbacks OAuth). En local, le proxy Vite la sert sous FRONTEND_URL.
const API_PUBLIC_URL = process.env.API_PUBLIC_URL || FRONTEND_URL;

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

const oauthCallbackUrl = (provider) => `${API_PUBLIC_URL}/api/auth/${provider}/callback`;
const oauthFail = (res, message) => res.redirect(`${FRONTEND_URL}/#oauth_error=${encodeURIComponent(message)}`);
const readCookie = (req, name) =>
  (req.headers.cookie || '').split(';').map(c => c.trim().split('=')).find(([k]) => k === name)?.[1];

app.get('/api/auth/:provider', async (req, res, next) => {
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
    let user = await db.get('SELECT * FROM users WHERE email = ?', profile.email);
    if (!user) {
      // Mot de passe aléatoire inutilisable : la colonne est NOT NULL, le compte se connecte via OAuth
      const hash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
      const result = await db.run('INSERT INTO users (name, first_name, email, password) VALUES (?, ?, ?, ?)', profile.name, profile.first_name, profile.email, hash);
      user = await db.get('SELECT * FROM users WHERE id = ?', result.lastInsertRowid);
    }
    const token = jwt.sign({ id: user.id, is_admin: !!user.is_admin }, JWT_SECRET, { expiresIn: '1h' });
    // Fragment (#) : le jeton n'est envoyé à aucun serveur ni journalisé
    res.redirect(`${FRONTEND_URL}/#oauth_token=${token}`);
  } catch (err) {
    console.error(`OAuth ${provider}:`, err.message);
    oauthFail(res, err.message);
  }
});

app.get('/api/users/:id', authenticateToken, async (req, res) => {
  if (parseInt(req.params.id) !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  const user = await db.get('SELECT id, name, first_name, gender, email, phone, is_admin FROM users WHERE id = ?', req.user.id);
  res.json(user || {});
});

app.put('/api/users/:id', authenticateToken, async (req, res) => {
  if (parseInt(req.params.id) !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  const { name, first_name, gender, phone } = req.body;
  await db.run('UPDATE users SET name = COALESCE(?, name), first_name = COALESCE(?, first_name), gender = COALESCE(?, gender), phone = COALESCE(?, phone) WHERE id = ?', name, first_name, gender, phone, req.user.id);
  const user = await db.get('SELECT id, name, first_name, gender, email, phone, is_admin FROM users WHERE id = ?', req.user.id);
  res.json(user);
});

// ── Admin: login ──────────────────────────────────────────────────────────────
app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  const user = await db.get('SELECT * FROM users WHERE email = ? AND is_admin = 1', email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id, is_admin: true }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, admin: { id: user.id, name: user.name, email: user.email } });
});

// ── Admin: users ──────────────────────────────────────────────────────────────
app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
  res.json(await db.all('SELECT id, name, first_name, email, phone, is_admin FROM users ORDER BY id ASC'));
});

app.post('/api/admin/users', authenticateAdmin, async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
  if (password.length < 8) return res.status(400).json({ error: 'Password too short' });
  if (await db.get('SELECT id FROM users WHERE email = ?', email)) {
    return res.status(409).json({ error: 'Email already in use' });
  }
  const hash = await bcrypt.hash(password, 12);
  let result;
  try {
    result = await db.run('INSERT INTO users (name, email, password, phone, is_admin) VALUES (?, ?, ?, ?, 1)', name, email, hash, phone || null);
  } catch (e) {
    // email est UNIQUE : rattrape la collision entre le pré-contrôle et l'insertion
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email already in use' });
    throw e;
  }
  res.status(201).json({ id: result.lastInsertRowid, name, email, phone: phone || null, is_admin: true });
});

app.delete('/api/admin/users/:id', authenticateAdmin, async (req, res) => {
  await db.run('DELETE FROM users WHERE id = ? AND is_admin = 0', req.params.id);
  res.json({ success: true });
});

// ── Admin: stats ──────────────────────────────────────────────────────────────
app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
  const stats = await db.get(`
    SELECT (SELECT COUNT(*) FROM users)                             AS total_users,
           (SELECT COUNT(*) FROM announcements)                     AS total_trips,
           (SELECT COUNT(*) FROM bookings)                          AS total_bookings,
           (SELECT COUNT(*) FROM announcements WHERE datetime > ?)  AS active_trips
  `, nowLocalMinute());
  res.json(stats);
});

// ── Admin: announcements ──────────────────────────────────────────────────────
app.get('/api/admin/announcements', authenticateAdmin, async (req, res) => {
  res.json(await db.all(`
    SELECT a.*, u.name as driver_name, u.email as driver_email
    FROM announcements a JOIN users u ON a.user_id = u.id
    ORDER BY a.datetime DESC
  `));
});

app.delete('/api/admin/announcements/:id', authenticateAdmin, async (req, res) => {
  await db.run('DELETE FROM announcements WHERE id = ?', req.params.id);
  res.json({ success: true });
});

// ── Admin: bookings ───────────────────────────────────────────────────────────
app.get('/api/admin/bookings', authenticateAdmin, async (req, res) => {
  res.json(await db.all(`
    SELECT b.*, u.name as user_name, u.email as user_email
    FROM bookings b JOIN users u ON b.user_id = u.id
    ORDER BY b.created_at DESC
  `));
});

// ── Announcements ─────────────────────────────────────────────────────────────
app.post('/api/announcements', authenticateToken, async (req, res) => {
  const { departure, destination, datetime, description } = req.body;
  const seats = parseInt(req.body.seats);
  if (!departure?.trim() || !destination?.trim() || !datetime || !seats) return res.status(400).json({ error: 'Missing fields' });
  if (seats < 1 || seats > 8) return res.status(400).json({ error: 'Le nombre de places doit être entre 1 et 8' });
  if (new Date(datetime) <= new Date()) return res.status(400).json({ error: 'La date de départ doit être dans le futur' });
  // Token encore valide mais compte supprimé : sinon la contrainte FOREIGN KEY fait planter l'INSERT
  if (!await db.get('SELECT 1 FROM users WHERE id = ?', req.user.id)) {
    return res.status(401).json({ error: 'User not found' });
  }
  // Le covoiturage est gratuit : aucun prix n'est enregistré
  const result = await db.run('INSERT INTO announcements (user_id, departure, destination, datetime, seats, description) VALUES (?, ?, ?, ?, ?, ?)', req.user.id, departure.trim(), destination.trim(), datetime, seats, description?.trim() || null);
  res.status(201).json({ id: result.lastInsertRowid, departure, destination, datetime, seats, description });
});

// Trajets publiés par l'utilisateur connecté, avec les places déjà réservées
app.get('/api/announcements/mine', authenticateToken, async (req, res) => {
  res.json(await db.all(`
    SELECT a.id, a.departure, a.destination, a.datetime, a.seats, a.description, a.created_at,
           COALESCE((SELECT SUM(b.seats) FROM bookings b WHERE b.announcement_id = a.id), 0) AS booked_seats
    FROM announcements a
    WHERE a.user_id = ?
    ORDER BY a.datetime DESC
  `, req.user.id));
});

app.get('/api/announcements', async (req, res) => {
  // route publique : on expose le nom du conducteur, jamais son email ni son user_id
  let query = `
    SELECT a.id, a.departure, a.destination, a.datetime, a.seats, a.price, a.description, u.name AS driver_name
    FROM announcements a JOIN users u ON a.user_id = u.id
    WHERE 1=1`;
  const params = [];
  if (req.query.departure)   { query += ' AND LOWER(a.departure) LIKE ?';   params.push(`%${req.query.departure.toLowerCase()}%`); }
  if (req.query.destination) { query += ' AND LOWER(a.destination) LIKE ?'; params.push(`%${req.query.destination.toLowerCase()}%`); }
  if (req.query.seats)       { query += ' AND a.seats >= ?';                params.push(parseInt(req.query.seats)); }
  if (req.query.date)        { query += ' AND LEFT(a.datetime, 10) = ?';    params.push(req.query.date); }
  query += ' ORDER BY a.datetime ASC';
  res.json(await db.all(query, ...params));
});

// ── Bookings ──────────────────────────────────────────────────────────────────
// Réserver décrémente les places restantes du trajet. Les colonnes à plat
// (departure/arrival/travel_date/travel_time) sont dérivées du trajet et non
// envoyées par le client : MyBookingsPage et l'admin les lisent encore.
// FOR UPDATE verrouille le trajet : deux réservations simultanées ne peuvent pas dépasser les places.
const bookSeats = (userId, announcementId, seats) => db.transaction(async (tx) => {
  const trip = await tx.get('SELECT * FROM announcements WHERE id = ? FOR UPDATE', announcementId);
  if (!trip) return { error: 'Trip not found', status: 404 };
  if (seats > trip.seats) return { error: 'Not enough seats', status: 409, available: trip.seats };

  const [travel_date, travel_time] = String(trip.datetime).split('T');
  await tx.run('UPDATE announcements SET seats = seats - ? WHERE id = ?', seats, announcementId);
  const result = await tx.run(
    'INSERT INTO bookings (user_id, announcement_id, departure, arrival, travel_date, travel_time, seats, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    userId, announcementId, trip.departure, trip.destination, travel_date, travel_time || null, seats, trip.price || 0
  );

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

app.post('/api/bookings', authenticateToken, async (req, res) => {
  const announcement_id = parseInt(req.body.announcement_id);
  const seats = parseInt(req.body.seats);
  if (!announcement_id) return res.status(400).json({ error: 'Missing announcement_id' });
  if (!seats || seats < 1) return res.status(400).json({ error: 'Invalid seats' });

  const out = await bookSeats(req.user.id, announcement_id, seats);
  if (out.error) return res.status(out.status).json({ error: out.error, available: out.available });
  res.status(201).json({ ...out.booking, seats_left: out.seats_left });
});

app.get('/api/bookings', authenticateToken, async (req, res) => {
  res.json(await db.all('SELECT id, departure, arrival, travel_date, travel_time, seats, price, status, created_at FROM bookings WHERE user_id = ? ORDER BY created_at DESC', req.user.id));
});

// Ne touche pas aux places : elles sont déjà déduites à la création de la réservation.
// L'admin confirme n'importe quelle réservation (AdminBookings), un utilisateur
// seulement les siennes.
app.post('/api/bookings/:id/confirm', authenticateToken, async (req, res) => {
  const result = req.user.is_admin
    ? await db.run("UPDATE bookings SET status = 'confirmed' WHERE id = ?", req.params.id)
    : await db.run("UPDATE bookings SET status = 'confirmed' WHERE id = ? AND user_id = ?", req.params.id, req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Booking not found' });
  res.json({ success: true });
});

// Annuler rend les places au trajet, sinon elles seraient perdues définitivement.
const cancelBooking = (bookingId, userId) => db.transaction(async (tx) => {
  const booking = await tx.get('SELECT * FROM bookings WHERE id = ? AND user_id = ? FOR UPDATE', bookingId, userId);
  if (!booking) return { deleted: false };
  await tx.run('DELETE FROM bookings WHERE id = ?', bookingId);
  if (booking.announcement_id) {
    await tx.run('UPDATE announcements SET seats = seats + ? WHERE id = ?', booking.seats, booking.announcement_id);
  }
  return { deleted: true };
});

app.delete('/api/bookings/:id', authenticateToken, async (req, res) => {
  const { deleted } = await cancelBooking(parseInt(req.params.id), req.user.id);
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

async function notifyUser(userId, title, message) {
  await db.run('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)', userId, title, message);
  const user = await db.get('SELECT email, first_name, name FROM users WHERE id = ?', userId);
  if (!mailer || !user) return;
  // Envoi en arrière-plan : un échec SMTP ne doit pas bloquer la réponse au voyageur
  mailer.sendMail({
    from: process.env.FROM_EMAIL || process.env.SMTP_USER,
    to: user.email,
    subject: `Charisma'Move – ${title}`,
    text: `Bonjour ${user.first_name || user.name},\n\n${message}\n\nL'équipe Charisma'Move`,
  }).catch(err => console.error('Email non envoyé :', err.message));
}

app.get('/api/notifications', authenticateToken, async (req, res) => {
  res.json(await db.all('SELECT id, title, message, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 50', req.user.id));
});

app.post('/api/notifications/read', authenticateToken, async (req, res) => {
  await db.run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', req.user.id);
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

// q : db ou la transaction en cours
const reservedSeats = async (lineId, date, q = db) =>
  (await q.get('SELECT COALESCE(SUM(seats), 0) AS n FROM bus_bookings WHERE line_id = ? AND service_date = ?', lineId, date)).n;

// Lignes actives et places restantes pour une date donnée
app.get('/api/bus-lines', async (req, res) => {
  const date = isServiceDate(req.query.date) ? req.query.date : null;
  const lines = await db.all(`
    SELECT l.id, l.name, l.seats, COALESCE(SUM(b.seats), 0) AS reserved
    FROM bus_lines l LEFT JOIN bus_bookings b ON b.line_id = l.id AND b.service_date = ?
    WHERE l.active = 1
    GROUP BY l.id, l.name, l.seats
    ORDER BY l.name
  `, date);
  res.json(lines.map(l => ({ ...l, available: Math.max(l.seats - l.reserved, 0) })));
});

// Vérification et insertion dans la même transaction. FOR UPDATE verrouille la ligne :
// deux réservations simultanées ne peuvent pas dépasser la capacité.
const bookBus = (userId, lineId, date, seats) => db.transaction(async (tx) => {
  const line = await tx.get('SELECT * FROM bus_lines WHERE id = ? AND active = 1 FOR UPDATE', lineId);
  if (!line) return { status: 404, error: 'Ligne introuvable' };
  const available = Math.max(line.seats - await reservedSeats(lineId, date, tx), 0);
  if (seats > available) return { status: 409, full: true, line, available };
  const result = await tx.run('INSERT INTO bus_bookings (line_id, user_id, service_date, seats) VALUES (?, ?, ?, ?)', lineId, userId, date, seats);
  return { booking: { id: result.lastInsertRowid, line_id: lineId, line_name: line.name, service_date: date, seats }, available: available - seats };
});

app.post('/api/bus-bookings', authenticateToken, async (req, res) => {
  const lineId = parseInt(req.body.line_id);
  const seats = parseInt(req.body.seats);
  const date = req.body.date;
  if (!lineId || !seats || seats < 1) return res.status(400).json({ error: 'Ligne et nombre de places requis' });
  if (!isServiceDate(date)) return res.status(400).json({ error: 'Date invalide' });
  if (date < todayLocal()) return res.status(400).json({ error: 'La date doit être aujourd\'hui ou plus tard' });
  if (!await db.get('SELECT 1 FROM users WHERE id = ?', req.user.id)) return res.status(401).json({ error: 'User not found' });

  const result = await bookBus(req.user.id, lineId, date, seats);
  if (result.full) {
    const message = result.available === 0
      ? `Il n'y a plus de places disponibles sur la ligne « ${result.line.name} » pour le ${formatServiceDate(date)}.`
      : `Il ne reste que ${result.available} place(s) sur la ligne « ${result.line.name} » pour le ${formatServiceDate(date)} : votre demande de ${seats} place(s) n'a pas pu être enregistrée.`;
    await notifyUser(req.user.id, 'Plus de places disponibles', message);
    return res.status(409).json({ error: message, available: result.available });
  }
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.status(201).json(result);
});

app.get('/api/bus-bookings', authenticateToken, async (req, res) => {
  res.json(await db.all(`
    SELECT b.id, b.service_date, b.seats, b.created_at, l.name AS line_name
    FROM bus_bookings b JOIN bus_lines l ON b.line_id = l.id
    WHERE b.user_id = ?
    ORDER BY b.service_date DESC
  `, req.user.id));
});

app.delete('/api/bus-bookings/:id', authenticateToken, async (req, res) => {
  const result = await db.run('DELETE FROM bus_bookings WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Booking not found' });
  res.json({ success: true });
});

// ── Admin: bus ────────────────────────────────────────────────────────────────
app.get('/api/admin/bus-lines', authenticateAdmin, async (req, res) => {
  const [lines, upcoming] = await Promise.all([
    db.all('SELECT * FROM bus_lines ORDER BY name'),
    db.all(`
      SELECT line_id, service_date, SUM(seats) AS reserved, COUNT(*) AS bookings
      FROM bus_bookings WHERE service_date >= ?
      GROUP BY line_id, service_date ORDER BY service_date
    `, todayLocal()),
  ]);
  res.json(lines.map(l => ({
    ...l,
    active: !!l.active,
    upcoming: upcoming.filter(u => u.line_id === l.id).map(({ line_id, ...u }) => u),
  })));
});

const validateLine = ({ name, seats }) => {
  if (!name?.trim()) return 'Le nom de la ligne est requis';
  if (!Number.isInteger(seats) || seats < 1 || seats > 500) return 'Le nombre de places doit être entre 1 et 500';
  return null;
};

app.post('/api/admin/bus-lines', authenticateAdmin, async (req, res) => {
  const name = req.body.name?.trim();
  const seats = parseInt(req.body.seats);
  const invalid = validateLine({ name, seats });
  if (invalid) return res.status(400).json({ error: invalid });
  if (await db.get('SELECT 1 FROM bus_lines WHERE name = ?', name)) return res.status(409).json({ error: 'Une ligne porte déjà ce nom' });
  const result = await db.run('INSERT INTO bus_lines (name, seats) VALUES (?, ?)', name, seats);
  res.status(201).json({ id: result.lastInsertRowid, name, seats, active: true, upcoming: [] });
});

app.put('/api/admin/bus-lines/:id', authenticateAdmin, async (req, res) => {
  const line = await db.get('SELECT * FROM bus_lines WHERE id = ?', req.params.id);
  if (!line) return res.status(404).json({ error: 'Ligne introuvable' });
  const name = req.body.name !== undefined ? req.body.name?.trim() : line.name;
  const seats = req.body.seats !== undefined ? parseInt(req.body.seats) : line.seats;
  const active = req.body.active !== undefined ? (req.body.active ? 1 : 0) : line.active;
  const invalid = validateLine({ name, seats });
  if (invalid) return res.status(400).json({ error: invalid });
  if (await db.get('SELECT 1 FROM bus_lines WHERE name = ? AND id != ?', name, line.id)) {
    return res.status(409).json({ error: 'Une ligne porte déjà ce nom' });
  }
  // On ne peut pas descendre sous les places déjà réservées pour un culte à venir
  const maxReserved = (await db.get(`
    SELECT COALESCE(MAX(total), 0) AS n FROM (
      SELECT SUM(seats) AS total FROM bus_bookings WHERE line_id = ? AND service_date >= ? GROUP BY service_date
    ) AS per_date`, line.id, todayLocal())).n;
  if (seats < maxReserved) {
    return res.status(409).json({ error: `Impossible : ${maxReserved} places sont déjà réservées pour un culte à venir` });
  }
  await db.run('UPDATE bus_lines SET name = ?, seats = ?, active = ? WHERE id = ?', name, seats, active, line.id);
  res.json({ id: line.id, name, seats, active: !!active });
});

app.delete('/api/admin/bus-lines/:id', authenticateAdmin, async (req, res) => {
  const result = await db.run('DELETE FROM bus_lines WHERE id = ?', req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Ligne introuvable' });
  res.json({ success: true });
});

app.get('/api/admin/bus-bookings', authenticateAdmin, async (req, res) => {
  let query = `
    SELECT b.id, b.line_id, b.service_date, b.seats, b.created_at, l.name AS line_name,
           u.name AS user_name, u.first_name AS user_first_name, u.email AS user_email, u.phone AS user_phone
    FROM bus_bookings b JOIN bus_lines l ON b.line_id = l.id JOIN users u ON b.user_id = u.id
    WHERE 1=1`;
  const params = [];
  if (req.query.line_id) { query += ' AND b.line_id = ?'; params.push(parseInt(req.query.line_id)); }
  if (isServiceDate(req.query.date)) { query += ' AND b.service_date = ?'; params.push(req.query.date); }
  query += ' ORDER BY b.service_date DESC, l.name, b.created_at';
  res.json(await db.all(query, ...params));
});

app.delete('/api/admin/bus-bookings/:id', authenticateAdmin, async (req, res) => {
  const result = await db.run('DELETE FROM bus_bookings WHERE id = ?', req.params.id);
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
// Erreurs imprévues (ex. MySQL indisponible) : réponse 500 propre, détail dans les logs uniquement
app.use((err, req, res, next) => {
  console.error(`${req.method} ${req.path} :`, err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

const PORT = process.env.PORT || 3001;
initDatabase()
  .then(() => app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`)))
  .catch((err) => {
    console.error('Impossible d\'initialiser la base MySQL :', err.message);
    process.exit(1);
  });
