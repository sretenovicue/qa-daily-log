const express = require('express');
const router  = express.Router();
const pool    = require('../db');

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ─── RSS Sources ──────────────────────────────────────────────────────────────

const SOURCES = [
  { id: 'devto',       name: 'dev.to / Testing',          url: 'https://dev.to/feed/tag/testing' },
  { id: 'mot',         name: 'Ministry of Testing',        url: 'https://www.ministryoftesting.com/feed' },
  { id: 'filiphric',   name: 'Filip Hric',                 url: 'https://filiphric.com/rss.xml' },
  { id: 'stefanjudis', name: 'Stefan Judis',               url: 'https://www.stefanjudis.com/rss.xml' },
  { id: 'testguild',   name: 'TestGuild (Joe Colantonio)', url: 'https://testguild.com/feed/' },
  { id: 'debbie',      name: 'Debbie O\'Brien (Playwright)', url: 'https://debbie.codes/feed.xml' },
];

let feedCache = { data: [], cachedAt: 0 };
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6h

async function fetchAllFeeds() {
  let Parser;
  try { Parser = require('rss-parser'); } catch {
    return [];
  }
  const parser = new Parser({ timeout: 8000, maxRedirects: 3 });

  const results = await Promise.allSettled(
    SOURCES.map(async (src) => {
      const feed = await parser.parseURL(src.url);
      return feed.items.slice(0, 8).map(item => ({
        id:       item.guid || item.link || item.title,
        title:    item.title || '',
        link:     item.link  || '',
        date:     item.pubDate || item.isoDate || '',
        summary:  (item.contentSnippet || '').slice(0, 180).trim(),
        source:   src.name,
        sourceId: src.id,
      }));
    })
  );

  return results.flatMap(r => r.status === 'fulfilled' ? r.value : [])
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

router.get('/feed', wrap(async (req, res) => {
  const now = Date.now();
  if (feedCache.data.length && now - feedCache.cachedAt < CACHE_TTL) {
    return res.json({ items: feedCache.data, cachedAt: feedCache.cachedAt, sources: SOURCES });
  }
  const items = await fetchAllFeeds();
  feedCache = { data: items, cachedAt: now };
  res.json({ items, cachedAt: now, sources: SOURCES });
}));

router.post('/feed/refresh', wrap(async (req, res) => {
  feedCache = { data: [], cachedAt: 0 };
  const items = await fetchAllFeeds();
  feedCache = { data: items, cachedAt: Date.now() };
  res.json({ items, cachedAt: feedCache.cachedAt, sources: SOURCES });
}));

// ─── Courses ──────────────────────────────────────────────────────────────────

const VALID_STATUSES = ['planned', 'in_progress', 'done'];

router.get('/courses', wrap(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM courses WHERE user_id = $1 ORDER BY created_at DESC',
    [req.userId]
  );
  res.json(rows);
}));

router.post('/courses', wrap(async (req, res) => {
  const { title, url, author, status, notes } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Naziv je obavezan' });
  const s = VALID_STATUSES.includes(status) ? status : 'planned';
  const { rows } = await pool.query(
    'INSERT INTO courses (user_id, title, url, author, status, notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [req.userId, title.trim(), url || null, author || null, s, notes || null]
  );
  res.status(201).json(rows[0]);
}));

router.patch('/courses/:id', wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Nevažeći ID' });
  const { title, url, author, status, notes } = req.body;
  const s = VALID_STATUSES.includes(status) ? status : null;
  const { rows } = await pool.query(
    `UPDATE courses
     SET title  = COALESCE($1, title),
         url    = COALESCE($2, url),
         author = COALESCE($3, author),
         status = COALESCE($4, status),
         notes  = COALESCE($5, notes)
     WHERE id = $6 AND user_id = $7 RETURNING *`,
    [title?.trim() || null, url || null, author || null, s, notes !== undefined ? (notes || null) : null, id, req.userId]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Kurs nije pronađen' });
  res.json(rows[0]);
}));

router.delete('/courses/:id', wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Nevažeći ID' });
  const { rows } = await pool.query(
    'DELETE FROM courses WHERE id = $1 AND user_id = $2 RETURNING id',
    [id, req.userId]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Kurs nije pronađen' });
  res.json({ ok: true });
}));

// ─── AI Recommendation (Gemini) ───────────────────────────────────────────────

router.post('/recommend', wrap(async (req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: 'Gemini API nije konfigurisan. Dodajte GEMINI_API_KEY u .env' });
  }

  const { rows: entries } = await pool.query(
    `SELECT category, project, status FROM entries
     WHERE user_id = $1 AND date::date >= CURRENT_DATE - INTERVAL '30 days'
     ORDER BY date DESC LIMIT 60`,
    [req.userId]
  );

  const categoryCounts = entries.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + 1;
    return acc;
  }, {});

  const rssHeadlines = feedCache.data.slice(0, 15)
    .map(item => `- ${item.title} (${item.source})`)
    .join('\n');

  const prompt = `Ti si iskusan QA ekspert koji mentoriše QA inženjera.

Aktivnosti korisnika u zadnjih 30 dana (kategorije):
${JSON.stringify(categoryCounts, null, 2)}

Najnoviji QA trendovi:
${rssHeadlines || '(nema dostupnih vijesti, RSS nije učitan)'}

Napiši personalnu preporuku (3-4 kratke rečenice) na srpskom:
1. Pohvali korisnikovu dominantnu aktivnost
2. Preporuči jedan konkretan trend/alat koji mu je relevantan
3. Daj konkretan sledeći korak za napredak
Budi direktan, bez generalnih fraza.`;

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );

  if (!geminiRes.ok) {
    const errText = await geminiRes.text();
    return res.status(502).json({ error: 'Gemini API greška: ' + errText.slice(0, 200) });
  }

  const data = await geminiRes.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Nema odgovora.';
  res.json({ recommendation: text });
}));

module.exports = router;
