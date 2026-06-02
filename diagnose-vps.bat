@echo off
title SportBar VPS Diagnose
ssh -i C:\Users\carbo\.ssh\id_ed25519 root@187.124.241.213 "echo '=== GIT LOG ===' && cd /var/www/sportbar && git log --oneline -3 && echo '' && echo '=== PM2 STATUS ===' && pm2 status && echo '' && echo '=== PM2 CONFIG ===' && pm2 show sportbar | grep -E 'script|cwd|status|restart' && echo '' && echo '=== NEXT BUILD DATE ===' && ls -la /var/www/sportbar/.next/BUILD_ID 2>/dev/null && cat /var/www/sportbar/.next/BUILD_ID 2>/dev/null && echo '' && echo '=== PAGE.TSX HASH ===' && md5sum /var/www/sportbar/src/app/menu/page.tsx && echo '=== SPLASH CHECK ===' && grep -c 'SplashScreen' /var/www/sportbar/src/app/menu/page.tsx && echo 'lineas con SplashScreen'"
pause
