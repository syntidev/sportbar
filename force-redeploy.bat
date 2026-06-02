@echo off
title SportBar Force Redeploy
echo === Verificando estructura de rutas en VPS ===
ssh -i C:\Users\carbo\.ssh\id_ed25519 root@187.124.241.213 "echo '--- App routes ---' && ls /var/www/sportbar/src/app/ && echo '' && echo '--- Menu route ---' && ls /var/www/sportbar/src/app/menu/ && echo '' && echo '--- Artisan check ---' && ls /var/www/sportbar/artisan 2>/dev/null && echo 'YES artisan found' || echo 'NO artisan (Next.js app, no PHP)' && echo '' && echo '--- Limpiando cache Next.js y rebuild completo ---' && cd /var/www/sportbar && rm -rf .next && npm run build && pm2 restart sportbar && echo '' && echo '--- Verificando respuesta HTTP /menu ---' && curl -s -o /dev/null -w '%%{http_code} - %%{time_total}s' http://localhost:3002/menu && echo '' && echo '--- pm2 status ---' && pm2 status"
pause
