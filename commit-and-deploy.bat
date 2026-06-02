@echo off
title SportBar — Commit + Deploy
echo ==========================================
echo  SportBar — Commit + Deploy multimedia
echo ==========================================
echo.
cd /d C:\laragon\www\sportbar

echo [0/3] Eliminando index.lock si existe...
if exist .git\index.lock (
    del /f .git\index.lock
    echo   index.lock eliminado.
) else (
    echo   Sin lock.
)

echo.
echo [1/3] Git add + commit...
git add -A
git commit -m "feat(media): sistema multimedia unificado + splash dinámica + fix overflow"
echo.

echo [2/3] Git push...
git push
echo.

echo [3/3] SSH deploy: pull + build + restart pm2...
ssh -i C:\Users\carbo\.ssh\id_ed25519 root@187.124.241.213 "cd /var/www/sportbar && git pull && npm run build && pm2 restart sportbar && pm2 status"
echo.
echo ==========================================
echo  Listo. Presiona cualquier tecla para cerrar.
echo ==========================================
pause
