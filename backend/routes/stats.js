const express        = require('express');
const router         = express.Router();
const pool           = require('../db');
const { requireManager } = require('../middleware/auth');

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/', wrap(async (req, res) => {
  const { from, to } = req.query;
  const today    = new Date().toISOString().slice(0, 10);
  const hasRange = from && to;
  const uid      = req.userId;

  const [total, todayRow, byCategory, byStatus, activity, byProject] = await Promise.all([
    hasRange
      ? pool.query('SELECT COUNT(*) as cnt, SUM(duration) as dur FROM entries WHERE user_id = $1 AND date >= $2 AND date <= $3', [uid, from, to])
      : pool.query('SELECT COUNT(*) as cnt, SUM(duration) as dur FROM entries WHERE user_id = $1', [uid]),

    pool.query(
      'SELECT COUNT(*) as cnt, SUM(duration) as dur FROM entries WHERE user_id = $1 AND date = $2',
      [uid, today]
    ),

    hasRange
      ? pool.query(`
          SELECT category, COUNT(*) as cnt, SUM(duration) as dur
          FROM entries WHERE user_id = $1 AND date >= $2 AND date <= $3
          GROUP BY category ORDER BY cnt DESC
        `, [uid, from, to])
      : pool.query(`
          SELECT category, COUNT(*) as cnt, SUM(duration) as dur
          FROM entries WHERE user_id = $1
          GROUP BY category ORDER BY cnt DESC
        `, [uid]),

    hasRange
      ? pool.query(`
          SELECT status, COUNT(*) as cnt
          FROM entries WHERE user_id = $1 AND date >= $2 AND date <= $3
          GROUP BY status ORDER BY cnt DESC
        `, [uid, from, to])
      : pool.query(`
          SELECT status, COUNT(*) as cnt
          FROM entries WHERE user_id = $1
          GROUP BY status ORDER BY cnt DESC
        `, [uid]),

    pool.query(`
      SELECT date, COUNT(*) as cnt, SUM(duration) as dur
      FROM entries
      WHERE user_id = $1 AND date >= (CURRENT_DATE - INTERVAL '13 days')::text
      GROUP BY date ORDER BY date ASC
    `, [uid]),

    pool.query(`
      SELECT project, category, COUNT(*) as cnt, SUM(duration) as dur
      FROM entries
      WHERE user_id = $1 AND date >= $2 AND date <= $3 AND project != ''
      GROUP BY project, category
      ORDER BY project, cnt DESC
    `, [uid, new Date(new Date().setDate(1)).toISOString().slice(0, 10), today]),
  ]);

  const monthStart = new Date();
  monthStart.setDate(1);

  res.json({
    total:      total.rows[0],
    today:      todayRow.rows[0],
    byCategory: byCategory.rows,
    byStatus:   byStatus.rows,
    activity:   activity.rows,
    byProject:  byProject.rows,
    monthStart: monthStart.toISOString().slice(0, 10),
  });
}));

// ── GET /api/stats/team (manager only) ───────────────────────────────
router.get('/team', requireManager, wrap(async (req, res) => {
  const now        = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const defaultTo   = now.toISOString().slice(0, 10);
  const from = req.query.from || defaultFrom;
  const to   = req.query.to   || defaultTo;

  const [byEmployee, byProject] = await Promise.all([
    pool.query(`
      SELECT
        u.id,
        u.username,
        u.title,
        COUNT(e.id)                                                  AS total,
        SUM(CASE WHEN e.category = 'auto'    THEN 1 ELSE 0 END)     AS auto,
        SUM(CASE WHEN e.category = 'manual'  THEN 1 ELSE 0 END)     AS manual,
        SUM(CASE WHEN e.action   = 'added'   THEN 1 ELSE 0 END)     AS added,
        SUM(CASE WHEN e.action   = 'updated' THEN 1 ELSE 0 END)     AS updated,
        COALESCE(SUM(e.duration), 0)                                 AS duration
      FROM users u
      LEFT JOIN entries e ON e.user_id = u.id AND e.date >= $1 AND e.date <= $2
      WHERE u.active = true
      GROUP BY u.id, u.username, u.title
      ORDER BY total DESC
    `, [from, to]),

    pool.query(`
      SELECT
        project,
        COUNT(*)                                                     AS total,
        SUM(CASE WHEN category = 'auto'    THEN 1 ELSE 0 END)       AS auto,
        SUM(CASE WHEN category = 'manual'  THEN 1 ELSE 0 END)       AS manual,
        SUM(CASE WHEN action   = 'added'   THEN 1 ELSE 0 END)       AS added,
        SUM(CASE WHEN action   = 'updated' THEN 1 ELSE 0 END)       AS updated,
        COALESCE(SUM(duration), 0)                                   AS duration
      FROM entries
      WHERE date >= $1 AND date <= $2 AND project != ''
      GROUP BY project
      ORDER BY total DESC
    `, [from, to]),
  ]);

  res.json({ byEmployee: byEmployee.rows, byProject: byProject.rows, from, to });
}));

module.exports = router;
