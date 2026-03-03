require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: true }   // verify TLS cert in production
    : false,
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      email         TEXT UNIQUE NOT NULL,
      username      TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS entries (
      id          SERIAL PRIMARY KEY,
      task_number TEXT NOT NULL,
      category    TEXT NOT NULL,
      action      TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'in-progress',
      description TEXT,
      duration    INTEGER DEFAULT 0,
      date        TEXT NOT NULL,
      time        TEXT NOT NULL,
      created_at  TIMESTAMP DEFAULT NOW(),
      project     TEXT DEFAULT '',
      user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_date       ON entries(date);
    CREATE INDEX IF NOT EXISTS idx_project    ON entries(project);
    CREATE INDEX IF NOT EXISTS idx_user_id    ON entries(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_date  ON entries(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_date_proj  ON entries(date, project);
  `);

  // Safe migrations — add columns only if they don't exist yet
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role   TEXT    DEFAULT 'user';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
  `);
}

initDb().catch(err => {
  console.error('DB init failed:', err.message);
  process.exit(1);
});

module.exports = pool;
