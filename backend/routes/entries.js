const express = require('express');
const router  = express.Router();
const pool    = require('../db');

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const COLS = 'e.id, e.task_number, e.category, e.action, e.status, e.description, e.duration, e.project, e.date, e.time, e.created_at, e.user_id';

function parseId(param) {
  const id = parseInt(param, 10);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

async function insertEntry(data) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const lastRow = await client.query(
      'SELECT task_number FROM entries WHERE date = $1 AND user_id = $2 ORDER BY id DESC LIMIT 1',
      [data.date, data.user_id]
    );

    let seq = 1;
    if (lastRow.rows[0]) {
      const parts = lastRow.rows[0].task_number.split('-');
      seq = parseInt(parts[parts.length - 1], 10) + 1;
    }

    const dateStr     = data.date.replace(/-/g, '');
    const task_number = `QA-${dateStr}-${String(seq).padStart(3, '0')}`;

    const result = await client.query(`
      INSERT INTO entries (task_number, category, action, status, description, duration, project, date, time, user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [task_number, data.category, data.action, data.status, data.description, data.duration, data.project, data.date, data.time, data.user_id]);

    const entry = await client.query(
      `SELECT ${COLS}, u.username FROM entries e LEFT JOIN users u ON u.id = e.user_id WHERE e.id = $1`,
      [result.rows[0].id]
    );

    await client.query('COMMIT');
    return entry.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── GET /api/entries ─────────────────────────────────────────────────
router.get('/', wrap(async (req, res) => {
  const { date, from, to, category, status, project, sort, limit = 500, offset = 0, userId } = req.query;
  const isManager = req.userRole === 'manager';

  let query    = `SELECT ${COLS}, u.username FROM entries e LEFT JOIN users u ON u.id = e.user_id WHERE 1=1`;
  const params = [];
  let i        = 1;

  // Non-managers always filtered to their own entries
  if (!isManager) {
    query += ` AND e.user_id = $${i++}`; params.push(req.userId);
  } else if (userId) {
    // Manager can optionally filter by a specific user
    query += ` AND e.user_id = $${i++}`; params.push(parseInt(userId, 10));
  }

  if (date) {
    query += ` AND e.date = $${i++}`; params.push(date);
  } else if (from && to) {
    query += ` AND e.date >= $${i++} AND e.date <= $${i++}`; params.push(from, to);
  }
  if (category) { query += ` AND e.category = $${i++}`; params.push(category); }
  if (status)   { query += ` AND e.status = $${i++}`;   params.push(status); }
  if (project)  { query += ` AND e.project = $${i++}`;  params.push(project); }

  switch (sort) {
    case 'date-asc':  query += ' ORDER BY e.date ASC,  e.id ASC';  break;
    case 'category':  query += ' ORDER BY e.category ASC';          break;
    case 'duration':  query += ' ORDER BY e.duration DESC';         break;
    case 'status':    query += ' ORDER BY e.status ASC';            break;
    default:          query += ' ORDER BY e.date DESC, e.id DESC';  break;
  }

  const lim = Math.min(parseInt(limit, 10) || 500, 1000);
  const off = Math.max(parseInt(offset, 10) || 0, 0);
  query += ` LIMIT $${i++} OFFSET $${i++}`;
  params.push(lim, off);

  const { rows } = await pool.query(query, params);
  res.json(rows);
}));

// ── POST /api/entries ────────────────────────────────────────────────
router.post('/', wrap(async (req, res) => {
  const { category, action, status = 'in-progress', description = '', duration = 0, project = '', date, time } = req.body;

  if (!category || !action || !date || !time) {
    return res.status(400).json({ error: 'Obavezna polja: category, action, date, time' });
  }

  const entry = await insertEntry({
    category, action, status,
    description,
    duration: parseInt(duration, 10) || 0,
    project, date, time,
    user_id: req.userId,
  });
  res.status(201).json(entry);
}));

// ── PATCH /api/entries/:id ───────────────────────────────────────────
router.patch('/:id', wrap(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID mora biti pozitivan ceo broj' });

  const { rows } = await pool.query(
    `SELECT ${COLS}, u.username FROM entries e LEFT JOIN users u ON u.id = e.user_id WHERE e.id = $1`,
    [id]
  );
  const existing = rows[0];
  if (!existing) return res.status(404).json({ error: `Unos #${id} nije pronađen` });

  // Ownership check — skip for managers
  if (req.userRole !== 'manager' && existing.user_id !== req.userId) {
    return res.status(403).json({ error: 'Nemate pristup ovom unosu' });
  }

  const { category, action, status, description, duration, project } = req.body;

  await pool.query(`
    UPDATE entries SET category = $1, action = $2, status = $3, description = $4, duration = $5, project = $6
    WHERE id = $7
  `, [
    category    ?? existing.category,
    action      ?? existing.action,
    status      ?? existing.status,
    description ?? existing.description,
    duration !== undefined ? parseInt(duration, 10) : existing.duration,
    project     ?? existing.project,
    id,
  ]);

  const updated = await pool.query(
    `SELECT ${COLS}, u.username FROM entries e LEFT JOIN users u ON u.id = e.user_id WHERE e.id = $1`,
    [id]
  );
  res.json(updated.rows[0]);
}));

// ── PUT /api/entries/:id (alias za PATCH) ────────────────────────────
router.put('/:id', wrap(async (req, res, next) => {
  req.method = 'PATCH';
  router.handle(req, res, next);
}));

// ── DELETE /api/entries/:id ──────────────────────────────────────────
router.delete('/:id', wrap(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID mora biti pozitivan ceo broj' });

  const { rows } = await pool.query('SELECT id, user_id FROM entries WHERE id = $1', [id]);
  const existing = rows[0];
  if (!existing) return res.status(404).json({ error: `Unos #${id} nije pronađen` });

  // Ownership check — skip for managers
  if (req.userRole !== 'manager' && existing.user_id !== req.userId) {
    return res.status(403).json({ error: 'Nemate pristup ovom unosu' });
  }

  await pool.query('DELETE FROM entries WHERE id = $1', [id]);
  res.json({ ok: true });
}));

module.exports = router;
