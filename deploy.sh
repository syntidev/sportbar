#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  SportBar — deploy.sh
#  Uso: bash deploy.sh
#  Commit + push + build + restart en VPS
# ═══════════════════════════════════════════════════════════════

set -e  # salir si cualquier comando falla

# ── CONFIG ───────────────────────────────────────────────────────
VPS_USER="root"                          # ← tu usuario SSH
VPS_HOST="tu-ip-o-dominio"              # ← IP o dominio del VPS
VPS_PATH="/var/www/sportbar"            # ← ruta del proyecto en VPS
APP_NAME="sportbar"                     # ← nombre en PM2

MSG="${1:-feat(splash): efectos VIP — steam dramático + frost visible + logo limpio + SPORT BAR protagonista}"

# ── 1. GIT LOCAL ─────────────────────────────────────────────────
echo ""
echo "▸ Commiteando cambios..."
git add -A
git commit -m "$MSG"
git push

echo "✓ Push completado."

# ── 2. DEPLOY VPS ────────────────────────────────────────────────
echo ""
echo "▸ Desplegando en VPS ($VPS_USER@$VPS_HOST)..."

ssh "$VPS_USER@$VPS_HOST" bash <<REMOTE
  set -e
  cd $VPS_PATH

  echo "  → git pull..."
  git pull

  echo "  → npm install (si hay nuevas deps)..."
  npm install --production=false

  echo "  → npm run build..."
  npm run build

  echo "  → pm2 restart $APP_NAME..."
  pm2 restart $APP_NAME || pm2 start npm --name "$APP_NAME" -- start

  echo "  ✓ Deploy VPS completado."
REMOTE

echo ""
echo "════════════════════════════════════════════"
echo "  ✓ DEPLOY COMPLETO — tusport.bar actualizado"
echo "════════════════════════════════════════════"
