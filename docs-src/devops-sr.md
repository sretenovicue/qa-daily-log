---
title: "QA Daily Log — DevOps Dokumentacija"
subtitle: "v4.0 — Raspberry Pi + Cloudflare Tunnel"
date: "Mart 2026"
geometry: margin=2.5cm
fontsize: 11pt
---

# QA Daily Log — DevOps Dokumentacija

**Verzija:** 4.0 | **Datum:** Mart 2026 | **Platforma:** Raspberry Pi 4 + Cloudflare Tunnel

---

## 1. Pregled Sistema

QA Daily Log je full-stack web aplikacija za praćenje QA aktivnosti. Hostovana je na Raspberry Pi 4 i dostupna putem Cloudflare Tunnel.

**Tehnologije:**

| Komponenta | Tehnologija |
|---|---|
| Backend | Node.js + Express (port 3001) |
| Frontend | React + Vite (build → statički fajlovi) |
| Baza | PostgreSQL (Neon cloud) |
| Process manager | PM2 |
| Tunel | Cloudflare Tunnel |
| Email | Gmail SMTP (nodemailer) |

---

## 2. Infrastruktura

### Raspberry Pi 4

- **Hostname:** `nasty.local`
- **IP adresa:** `192.168.1.107`
- **SSH korisnik:** `sretenovicue`
- **Lokacija aplikacije:** `~/qa-daily-log/`
- **PM2 process:** `qa-backend`

### SSH Pristup

```bash
# Lokalna mreža
ssh sretenovicue@nasty.local

# Remote pristup putem Cloudflare Tunnel
ssh -o ProxyCommand="cloudflared access ssh --hostname HOSTNAME" sretenovicue@nasty.local
```

---

## 3. Konfiguracija (.env)

Fajl `backend/.env` na Raspberry Pi:

```
DATABASE_URL=postgresql://...@neon.tech/...
PORT=3001
ALLOWED_ORIGIN=https://qa-daily-log.online
JWT_SECRET=tajni-kljuc-min-32-znaka
JWT_EXPIRY=7d
EMAIL_USER=vas-gmail@gmail.com
EMAIL_PASS=app-password
GEMINI_API_KEY=AI...
APP_URL=https://qa-daily-log.online
```

---

## 4. Deploy Procedura

### Pre svakog deploya — OBAVEZNI TESTOVI

```bash
# 1. Unit testovi
cd frontend && npm test
cd backend  && npm test

# 2. E2E testovi (svi moraju proći!)
npx playwright test

# 3. Prikaz HTML reporta (podeliti sa timom)
npx playwright show-report
```

### Automatski Deploy (preporučeno)

```bash
# Jednom komandom — testovi → GitHub push → Pi deploy:
./deploy.sh
```

> **SSH ključ:** `~/.ssh/qa_deploy_key` — lozinka nije potrebna.

### Ručni Deploy (rezervni postupak)

```bash
# 1. Push na GitHub
git add .
git commit -m "feat/fix: opis izmena"
git push origin main

# 2. SSH na Pi
ssh -i ~/.ssh/qa_deploy_key sretenovicue@192.168.1.107

# 3. Na Pi — povuci izmene i restartuj
cd ~/qa-daily-log
git pull origin main
cd backend && npm install
pm2 restart qa-backend --update-env
pm2 save

# 4. Provera statusa
pm2 status
pm2 logs qa-backend --lines 30
curl http://localhost:3001/api/health
```

---

## 5. PM2 Komande

```bash
pm2 status                          # Status procesa
pm2 logs qa-backend                 # Live logovi
pm2 logs qa-backend --lines 100     # Poslednjih 100 linija
pm2 restart qa-backend              # Restart
pm2 stop qa-backend                 # Stop
pm2 start ecosystem.config.js       # Start sa konfiguracijom
pm2 save                            # Sačuvaj config (preživljava reboot)
pm2 startup                         # Autostart pri bootu
```

---

## 6. Baza Podataka (Neon PostgreSQL)

### Tabele

```sql
-- Unosi
entries (id, task_number, category, action, status, description,
         duration, project, date, time, created_at, user_id)

-- Korisnici
users (id, email, username, password_hash, role, active, approved,
       avatar_data, title, email_token, email_confirmed, created_at)

-- QA Hub kursevi
courses (id, user_id, title, url, author, status, notes, created_at)
```

### Backup

```bash
node backend/backup.js      # SQLite + JSON backup, čuva poslednjih 30
```

---

## 7. Migracije Baze

Sve migracije su u `backend/db.js` i izvršavaju se automatski pri startu:

- `email_token`, `email_confirmed` — email verifikacija
- `project` — projekat na unosu
- `courses` — QA Hub kursevi

---

## 8. Email Konfiguracija

Gmail SMTP sa App Password (ne obična lozinka):

1. Google Account → Security → 2-Step Verification → App passwords
2. Kreirati App Password za "Mail"
3. Staviti u `EMAIL_PASS` u `.env`

**Email eventi:**
- Registracija → confirm email (korisnik mora kliknuti link)
- Odobrenje → welcome email (manager odobri nalog)

---

## 9. Sigurnost

| Mehanizam | Detalji |
|---|---|
| Rate limiter | 10 req/15min za login + register |
| JWT | Expire 7d, tajni ključ u .env |
| bcrypt | Hash faktor 10 |
| Helmet | Security headers (CSP, XSS, HSTS, ...) |
| CORS | Samo ALLOWED_ORIGIN |
| SQL injection | Parameterizovani upiti svuda |
| Email verifikacija | Token 64 hex znaka, 1x upotrebljiv |
| Payload limit | 50KB max |

---

## 10. Stress i Sigurnosni Testovi

```bash
# k6 stress testovi
brew install k6
k6 run tests/stress/smoke.stress.js   # Smoke (1 VU, 1 iteracija)
k6 run tests/stress/api.stress.js     # Load test (do 50 VU)

# Sigurnosni testovi (deo Playwright sute)
npx playwright test tests/e2e/security.spec.ts
```

---

## 11. Monitoring

- **PM2 logs** — HTTP access log (morgan), greške
- **Playwright HTML report** — `npx playwright show-report`
- Preporučeni alati za produkciju: **Sentry** (error tracking), **Grafana** (metrike)

---

## 12. Troubleshooting

**Backend ne startuje:**
```bash
pm2 logs qa-backend --lines 50
node backend/server.js    # Test direktno
```

**Greška baze:**
```bash
psql $DATABASE_URL -c "SELECT 1"    # Test konekcije
```

**Cloudflare Tunnel problem:**
```bash
cloudflared tunnel info
cloudflared tunnel run
```

**Port 3001 zauzet:**
```bash
lsof -i :3001
kill -9 $(lsof -ti :3001)
pm2 start qa-backend
```
