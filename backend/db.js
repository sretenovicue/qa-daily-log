require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

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
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role     TEXT    DEFAULT 'user';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS active   BOOLEAN DEFAULT true;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT true;
  `);

  // Seed admin user if it doesn't exist
  const existing = await pool.query("SELECT id FROM users WHERE username = 'admin'");
  if (!existing.rows[0]) {
    const hash = await bcrypt.hash('admin', 10);
    await pool.query(
      "INSERT INTO users (email, username, password_hash, role, active, approved) VALUES ('admin@admin.com', 'admin', $1, 'manager', true, true)",
      [hash]
    );
    console.log('Admin user created (username: admin, password: admin)');
  }

  // Seed guest user if it doesn't exist
  const existingGuest = await pool.query("SELECT id FROM users WHERE username = 'guest'");
  if (!existingGuest.rows[0]) {
    const hash = await bcrypt.hash('guest', 10);
    await pool.query(
      "INSERT INTO users (email, username, password_hash, role, active, approved) VALUES ('guest@guest.com', 'guest', $1, 'guest', true, true)",
      [hash]
    );
    console.log('Guest user created (username: guest, password: guest)');
  }
}

initDb().catch(err => {
  console.error('DB init failed:', err.message);
  process.exit(1);
});

module.exports = pool;
