@echo off
title SportBar VPS Deploy
echo === SSH deploy con codigo nuevo ===
ssh -i C:\Users\carbo\.ssh\id_ed25519 root@187.124.241.213 "cd /var/www/sportbar && git pull && npm run build && pm2 restart sportbar && pm2 status"
echo.
echo === Deploy completo ===
pause
