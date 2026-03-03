const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const pool     = require('../db');
const authMiddleware = require('../middleware/auth');

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signToken(userId, role) {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRY || '7d' });
}

// ── POST /api/auth/register ───────────────────────────────────────────
router.post('/register', wrap(async (req, res) => {
  const { email, username, password } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ error: 'Sva polja su obavezna: email, username, password' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Email format nije validan' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Lozinka mora imati najmanje 8 znakova' });
  }

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing.rows[0]) {
    return res.status(409).json({ error: 'Email je već registrovan' });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id, role, active',
    [email.toLowerCase(), username.trim(), password_hash]
  );

  const row   = result.rows[0];
  const user  = { id: row.id, email: email.toLowerCase(), username: username.trim(), role: row.role, active: row.active };
  const token = signToken(user.id, user.role);

  res.status(201).json({ token, user });
}));

// ── POST /api/auth/login ──────────────────────────────────────────────
router.post('/login', wrap(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email i lozinka su obavezni' });
  }

  const { rows } = await pool.query(
    'SELECT * FROM users WHERE email = $1 OR username = $1',
    [email.toLowerCase()]
  );
  const row = rows[0];
  if (!row) {
    return res.status(401).json({ error: 'Pogrešan email ili lozinka' });
  }

  if (row.active === false) {
    return res.status(401).json({ error: 'Nalog je deaktiviran. Kontaktirajte menadžera.' });
  }

  const match = await bcrypt.compare(password, row.password_hash);
  if (!match) {
    return res.status(401).json({ error: 'Pogrešan email ili lozinka' });
  }

  const user  = { id: row.id, email: row.email, username: row.username, role: row.role || 'user', active: row.active };
  const token = signToken(user.id, user.role);

  res.json({ token, user });
}));

// ── GET /api/auth/me ──────────────────────────────────────────────────
router.get('/me', authMiddleware, wrap(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, email, username, role, active, created_at FROM users WHERE id = $1',
    [req.userId]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Korisnik nije pronađen' });
  res.json(rows[0]);
}));

module.exports = router;
