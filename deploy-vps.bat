@echo off
title CafeBall Deploy VPS
echo ==========================================
echo  CafeBall -- Deploy SportBar VPS
echo ==========================================
echo.
cd /d C:\laragon\www\sportbar
echo [1/2] Git push...
git push >> deploy-log.txt 2>&1
git push
echo.
echo [2/2] SSH deploy + build...
echo --- SSH deploy --- >> deploy-log.txt 2>&1
ssh -i C:\Users\carbo\.ssh\id_ed25519 root@187.124.241.213 "cd /var/www/sportbar && git pull && npm run build && pm2 restart sportbar && pm2 status" >> deploy-log.txt 2>&1
ssh -i C:\Users\carbo\.ssh\id_ed25519 root@187.124.241.213 "cd /var/www/sportbar && git pull && npm run build && pm2 restart sportbar && pm2 status"
echo.
echo ==========================================
echo  Log guardado en deploy-log.txt
echo ==========================================
pause
