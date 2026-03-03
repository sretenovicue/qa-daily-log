/**
 * Backup script — kopira SQLite bazu i eksportuje sve unose u JSON
 * Pokretanje: node backend/backup.js
 * Ili dodaj u cron: 0 18 * * * cd /path/to/testApp && node backend/backup.js
 */
const fs   = require('fs');
const path = require('path');
const db   = require('./db');

const BACKUP_DIR = path.join(__dirname, 'backups');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);

const ts   = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
const base = path.join(BACKUP_DIR, ts);

// 1. Copy SQLite file
const src = path.join(__dirname, 'database.sqlite');
if (fs.existsSync(src)) {
  fs.copyFileSync(src, `${base}.sqlite`);
  console.log(`✓ SQLite backup: backups/${ts}.sqlite`);
}

// 2. Export all entries to JSON
const entries = db.prepare('SELECT * FROM entries ORDER BY date ASC, id ASC').all();
fs.writeFileSync(`${base}.json`, JSON.stringify(entries, null, 2), 'utf-8');
console.log(`✓ JSON backup: backups/${ts}.json (${entries.length} unosa)`);

// 3. Keep only last 30 backups (cleanup old)
const files = fs.readdirSync(BACKUP_DIR).sort();
const groups = [...new Set(files.map(f => f.replace(/\.(sqlite|json)$/, '')))];
if (groups.length > 30) {
  groups.slice(0, groups.length - 30).forEach(g => {
    ['.sqlite', '.json'].forEach(ext => {
      const f = path.join(BACKUP_DIR, g + ext);
      if (fs.existsSync(f)) { fs.unlinkSync(f); }
    });
  });
  console.log(`✓ Obrisan stari backup (zadržano poslednjih 30)`);
}

console.log('Backup završen.');
process.exit(0);
