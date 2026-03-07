#!/bin/bash
set -e

# ─── Config ───────────────────────────────────────────────────────────────────
PI_USER="sretenovicue"
PI_HOST="192.168.1.107"
PI_DIR="qa-daily-log"
PM2_NAME="qa-backend"
SSH_KEY="$HOME/.ssh/qa_deploy_key"
REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓ $1${NC}"; }
info() { echo -e "${BLUE}▶ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
fail() { echo -e "${RED}✗ $1${NC}"; exit 1; }

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  QA Daily Log — Deploy Script"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ─── SSH key setup (jednom) ───────────────────────────────────────────────────
if [ ! -f "$SSH_KEY" ]; then
  info "Postavljam SSH ključ (jednom)..."
  ssh-keygen -t ed25519 -f "$SSH_KEY" -N "" -C "qa-deploy" -q
  ssh-copy-id -i "$SSH_KEY.pub" "$PI_USER@$PI_HOST" || fail "ssh-copy-id nije uspeo"
  ok "SSH ključ postavljen"
fi

SSH="ssh -i $SSH_KEY -o StrictHostKeyChecking=no $PI_USER@$PI_HOST"

# ─── 1. Uncommitted changes ───────────────────────────────────────────────────
cd "$REPO_ROOT"
if [ -n "$(git status --porcelain)" ]; then
  warn "Imaš uncommitted promene:"
  git status --short
  echo ""
  read -p "Nastavi bez commita? (y/N) " -n 1 -r; echo ""
  [[ ! $REPLY =~ ^[Yy]$ ]] && fail "Prekidam. Commituj promene pa ponovi."
fi

# ─── 2. Unit testovi ──────────────────────────────────────────────────────────
info "Pokrećem unit testove..."
cd "$REPO_ROOT/frontend" && npm test -- --run --silent || fail "Frontend testovi PALI"
ok "Frontend testovi (vitest)"
cd "$REPO_ROOT/backend" && npm test -- --run --silent || fail "Backend testovi PALI"
ok "Backend testovi (vitest)"

# ─── 3. Push na GitHub ────────────────────────────────────────────────────────
info "Push na GitHub..."
cd "$REPO_ROOT"
git push origin main && ok "GitHub push" || fail "Git push nije uspeo"

# ─── 4. Deploy na Pi ──────────────────────────────────────────────────────────
info "Deploying na Pi ($PI_HOST)..."

$SSH "
  set -e
  cd ~/$PI_DIR

  echo '  → git pull'
  git pull --ff-only

  echo '  → backend npm install'
  cd backend && npm install --omit=dev --silent

  echo '  → frontend build'
  cd ../frontend && npm install --silent && npm run build

  echo '  → pm2 restart'
  pm2 restart $PM2_NAME --update-env --silent

  echo '  → status'
  pm2 list | grep $PM2_NAME
" || fail "Deploy na Pi nije uspeo"

echo ""
ok "Deploy završen! 🚀"
echo -e "${BLUE}  https://qa-daily-log.online${NC}"
echo ""
