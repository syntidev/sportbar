# SESSION HANDOFF — SportBar POS
# Fecha: 29 Mayo 2026

## ESTADO PRODUCCIÓN
URL: https://tusport.bar
VPS: 187.124.241.213 | PM2: sportbar puerto 3002
Repo: https://github.com/syntidev/sportbar
Local: C:\laragon\www\sportbar
DB: sportbar @ 127.0.0.1:3306 (syntiweb_user / ReloadForMoney26#)

## LO QUE FUNCIONA HOY

✅ Login PIN (ADM-001 / 1234, USR-001 / 1234)
✅ Home PWA — 3 botones grandes + stats en vivo
✅ Nueva Orden — 4 pasos, precio coerce fix, redirect a /
✅ Comandas personales del mesero — tabs ACTIVAS/LISTAS/ENTREGADAS/COBRADAS, timer live
✅ Cobrar — modal pago 6 métodos, countdown 5s post-pago, ticket opcional
✅ Ticket térmico — HTML 58/80mm, auto-print en iOS/Android via <a> target="_blank"
✅ KDS Cocina, Bar, Despacho — bump, alertas 5min
✅ Admin: Mission Control, Turno, Menú+fotos, Equipo+horarios, Estructura venues
✅ Admin: Config cobros (métodos dinámicos + terminales POS)
✅ Admin: Perfil negocio — info, logo, ticket configurable con 10 toggles + preview RT
✅ Admin: Caja, Partido autopsy
✅ BD: 6 migraciones aplicadas, 15 productos, Daniel como admin
✅ SSL tusport.bar + Cloudflare + PM2

## PENDIENTE INMEDIATO

1. Probar comandas personales en producción (último deploy)
2. Configurar Supabase (crear cuenta free → URL + ANON_KEY → .env VPS)
3. Subir logos nuevos al VPS public/
4. Importar productos xlsx en producción
5. Crear venues reales de Daniel en /admin/estructura
6. Admin layout unificado (sidebar/shell — deuda visual crítica)

## SPRINT 4 — PRÓXIMO

- Módulo inventario/lotes: abrir lote → asignar venue → cierre → cuadre
- KPIs post-partido
- Catálogo público /menu pulido (fotos fotógrafo)
- Script certify.ts en producción

## DEUDA TÉCNICA

- Analytics visitas por canal (QR/www/local, dispositivo, OS)
- Score en vivo LPB
- E-commerce merchandising
- Plan B agente IA
- Zonas geográficas estadio (mapa Daniel pendiente)
- package.json name: cafeball → sportbar (ya en package.json, falta verificar)

## VISIÓN ESTRATÉGICA (documentada)

- SportBar = módulo vertical de ActivoPOS para venues/estadios
- EventOS = red de kioskos para eventos masivos (200K Margarita Nov 2026)
- Empresa con Daniel: sistemas para eventos + red Margarita
- Logo universal pendiente: concepto EPICENTRO (círculo irradiando energía)
  No deporte específico — funciona para cualquier evento

## COMANDOS CLAVE

```bash
# SSH
ssh -i C:\Users\carbo\.ssh\id_ed25519 root@187.124.241.213

# Deploy completo
cd /var/www/sportbar && git pull && npx prisma generate && npx prisma migrate deploy && npm run build && pm2 restart sportbar

# Logs
pm2 logs sportbar --lines 30
```

## AGENTES

- Claude Code CLI #1, #2, #3 → C:\laragon\www\sportbar
- CoWork → C:\laragon\www\sportbar (Sonnet 4.6)
- Claude Web → estrategia y documentación

## DOCS EN .doc/

- MASTER_DOC_SPORTBAR_v4.docx + v5_addendum.docx
- MASTER_DOC_SYNTIMEAT_v1.md (827 líneas)
- Documentacion_Funcional_LOYVERSE.md (979 líneas, GAP analysis completo)
- SESSION_HANDOFF_28MAY2026.md
- SportBar Mesero App _offline.html
- SportBar Men_ Cliente _offline_.html (demo Claude Design)
