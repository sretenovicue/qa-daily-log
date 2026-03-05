const express        = require('express');
const router         = express.Router();
const bcrypt         = require('bcryptjs');
const pool           = require('../db');
const { requireManager } = require('../middleware/auth');

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseId(param) {
  const id = parseInt(param, 10);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

// All routes require manager role
router.use(requireManager);

// ── GET /api/users/pending-count ──────────────────────────────────────
router.get('/pending-count', wrap(async (req, res) => {
  const { rows } = await pool.query(
    "SELECT COUNT(*) FROM users WHERE approved = false"
  );
  res.json({ count: parseInt(rows[0].count, 10) });
}));

// ── GET /api/users ────────────────────────────────────────────────────
router.get('/', wrap(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, email, username, role, active, approved, avatar_data, title, created_at FROM users ORDER BY created_at ASC'
  );
  res.json(rows);
}));

// ── POST /api/users ───────────────────────────────────────────────────
router.post('/', wrap(async (req, res) => {
  const { email, username, password, role = 'user' } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ error: 'Sva polja su obavezna: email, username, password' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Email format nije validan' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Lozinka mora imati najmanje 8 znakova' });
  }
  if (!['user', 'manager'].includes(role)) {
    return res.status(400).json({ error: 'Uloga mora biti user ili manager' });
  }

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing.rows[0]) {
    return res.status(409).json({ error: 'Email je već registrovan' });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    'INSERT INTO users (email, username, password_hash, role, approved) VALUES ($1, $2, $3, $4, true) RETURNING id, email, username, role, active, approved, created_at',
    [email.toLowerCase(), username.trim(), password_hash, role]
  );

  res.status(201).json(result.rows[0]);
}));

// ── POST /api/users/:id/approve — approve pending user ───────────────
router.post('/:id/approve', wrap(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID mora biti pozitivan ceo broj' });

  const { rows } = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
  if (!rows[0]) return res.status(404).json({ error: 'Korisnik nije pronađen' });

  const updated = await pool.query(
    'UPDATE users SET approved = true WHERE id = $1 RETURNING id, email, username, role, active, approved, created_at',
    [id]
  );
  res.json(updated.rows[0]);
}));

// ── PATCH /api/users/:id/title — set title ───────────────────────────
router.patch('/:id/title', wrap(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID mora biti pozitivan ceo broj' });

  const title = req.body.title ?? null;

  const { rows } = await pool.query(
    'UPDATE users SET title = $1 WHERE id = $2 RETURNING id, email, username, role, active, approved, avatar_data, title, created_at',
    [title || null, id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Korisnik nije pronađen' });
  res.json(rows[0]);
}));

// ── PATCH /api/users/:id — toggle active ─────────────────────────────
router.patch('/:id', wrap(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID mora biti pozitivan ceo broj' });

  // Manager cannot deactivate themselves
  if (id === req.userId) {
    return res.status(400).json({ error: 'Ne možete deaktivirati sopstveni nalog' });
  }

  const { rows } = await pool.query('SELECT id, username, role, active FROM users WHERE id = $1', [id]);
  if (!rows[0]) return res.status(404).json({ error: 'Korisnik nije pronađen' });

  // Cannot deactivate admin or guest accounts
  if (['admin', 'guest'].includes(rows[0].username)) {
    return res.status(400).json({ error: `Ne možete deaktivirati nalog "${rows[0].username}"` });
  }

  const newActive = !rows[0].active;
  const updated = await pool.query(
    'UPDATE users SET active = $1 WHERE id = $2 RETURNING id, email, username, role, active, created_at',
    [newActive, id]
  );

  res.json(updated.rows[0]);
}));

module.exports = router;
