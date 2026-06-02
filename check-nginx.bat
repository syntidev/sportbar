@echo off
title SportBar Nginx Check
ssh -i C:\Users\carbo\.ssh\id_ed25519 root@187.124.241.213 "echo '=== NGINX CONFIG tusport.bar ===' && cat /etc/nginx/sites-enabled/tusport.bar 2>/dev/null || cat /etc/nginx/sites-enabled/sportbar 2>/dev/null || grep -r 'tusport\|sportbar\|3002' /etc/nginx/sites-enabled/ 2>/dev/null && echo '' && echo '=== NGINX PROXY PASS ===' && grep -r 'proxy_pass\|proxy_cache\|3002' /etc/nginx/sites-enabled/ 2>/dev/null && echo '' && echo '=== PORT CHECK ===' && ss -tlnp | grep '3002\|80\|443'"
pause
