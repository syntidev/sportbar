# SYNTImeat — Session Handoff
# Fecha: 26 Mayo 2026 (tarde — v2)
# Estado: PRODUCCIÓN ACTIVA — Caja certificada + Stock Pool correcto

---

## CONTEXTO

Proyecto: SYNTImeat — POS Carnicería Chaguaramas
Repo: https://github.com/syntidev/syntimeat — Branch: main
Producción: https://meat.synti.cloud
VPS: 187.124.241.213 (Ubuntu 24.04 — Hostinger KVM1)
Local: C:\laragon\www\syntimeat
Super admin oculto: carbolivar@gmail.com (is_hidden=1, ID=20)

Certificación activa: stress_test.php 146/146 ✅ | AccesoRolesTest 28/28 ✅

---

## CREDENCIALES PRODUCCIÓN

```
carbolivar@gmail.com       → super_admin  | Chaguaramas2026! (is_hidden=1)
dueno@chaguaramas.com      → owner        | Chaguaramas2026!
admin@elbuencorte.com      → branch_admin | Chaguaramas2026!
contable1@chaguaramas.com  → analyst      | Chaguaramas2026!
contable2@elbuencorte.com  → analyst      | Chaguaramas2026!
cajera1@chaguaramas.com    → cashier      | Chaguaramas2026!
cajera2@elbuencorte.com    → cashier      | Chaguaramas2026!
cajera2@chaguaramas.com    → cashier      | Chaguaramas2026!
```

DB VPS: syntimeat_db / syntimeat / SyntiMeat2026!

---

## TAGS DE RESTAURACIÓN

| Tag | Descripción |
|-----|-------------|
| `v1.0-certificado` | Aritmética contable — Wave 1-5 + Fase 19 stress_test 146/146 |
| `v1.1-caja-certificada` | Flujo de caja completo certificado |
| `v1.2-ciclo-caja` | Ciclo completo caja apertura→venta→corte→cierre |
| `v1.3-stock-pool` | Stock pool correcto — Premium/Primera/Segunda desde Carne del Canal |

---

## CERTIFICADO HOY (26/05/2026 tarde)

### Flujo de Caja Completo ✅

1. Apertura de caja con monto inicial
2. Venta en efectivo → saldo sube
3. Venta por pago móvil → NO suma al saldo efectivo (correcto)
4. Retiro manual → descuenta del saldo
5. Cierre del día → saldo esperado = exactamente 0 diferencia
6. Apertura nueva caja al día siguiente

### Fixes aplicados — CashRegisterController

- **route binding**: `{register}` vs `$cashRegister` corregido en `movement()` y `confirmClose()`
- **business_id**: comparación `==` flexible (evita mismatch tipo string/int)
- **Saldo esperado**: solo ventas `type=cash` — pago móvil excluido del saldo efectivo
- **Movimientos**: usan `amount_bs` directo (no `amount_usd × rate` — evita drift)
- **Botón cierre**: permite efectivo=0 (cajas sin movimiento también pueden cerrarse)
- **Return type**: `RedirectResponse|JsonResponse` en `movement()` para compatibilidad Inertia

### Stock Pool — Premium/Primera/Segunda ✅

- `stock_product_id` aplicado en `pay()` — los cortes Premium, Primera y Segunda
  descuentan su stock de "Carne del Canal" (el pool de stock de res)
- Flujo correcto: Bóveda → Fábrica → Carne del Canal (pool) → POS descuenta del pool

### Datos demo limpiados ✅

- Sistema limpiado de datos de demostración
- Listo para recibir datos reales de producción

---

## PRÓXIMO A CONSTRUIR

### Widget "Rendimiento por Canal"
- Checkboxes dinámicos por canal (Res, Cerdo, Pollo, Charcutería)
- Métricas: kg entrada, kg vendidos, costo, ingresos, utilidad, margen
- Filtrable por rango de fechas

### Remanente Acumulado por Día
- "Bola de nieve" — acumulación de utilidad día a día
- Gráfico de línea con tendencia semanal/mensual
- Base para proyecciones de flujo de caja

### Utilidad Real vs Utilidad Potencial por Canal
- Real: lo que se vendió efectivamente
- Potencial: si todo el stock surtido se hubiera vendido a precio lista
- Gap: desperdicio/merma implícita

---

## DEUDA TÉCNICA PENDIENTE

- [ ] `branch_id` no está en `$fillable` de `Sale` — bug latente si se asigna por masa
- [ ] `console.php` tiene `dollar:update` duplicado (comando no existe en syntimeat — solo `dollar:fetch`)
- [ ] Responsive tablet — certificación visual pendiente
- [ ] Simulador interactivo para inducción del operador (pendiente de diseño)
- [ ] Módulo merma compensada por chorizo (valor agregado — requiere diseño)
- [ ] `.env.testing` con DB separada para aislar Feature Tests de DB real
- [ ] IVA en ticket (futuro — requiere configuración por negocio)
- [ ] QR en ticket (futuro)
- [ ] Tendencia vs ayer en Dashboard — requiere prop `ventas_ayer` en `DashboardController`
- [ ] Debug output en Fase 19.B.2 y 19.C.3 — remover antes de release final

---

## PROTOCOLO IRROMPIBLE

- Auditar primero. CLI-A consulta, CLI-B ejecuta. Nunca CoWork sin prompt completo.
- NUNCA `php artisan test` sin `--filter` (borra DB con RefreshDatabase)
- NUNCA `php artisan test --testsuite=Feature` (ídem)
- NUNCA commit sin stress test 146/146 + roles test 28/28
- `npm run build` obligatorio en VPS después de cualquier cambio Vue
- `loginUsingId` dinámico: `User::where('role','super_admin')->where('is_hidden',0)->value('id')`
- `Sale::find($id)` para leer campos frescos de DB — nunca `->fresh()` sobre arrays JSON decodificados

---

## ESTADO DE TESTS

- `stress_test.php`: 146/146 PASS (19 fases)
- `AccesoRolesTest.php`: 28/28 PASS
- `phpunit.xml`: `DB_DATABASE :memory:` ELIMINADO — usa MySQL real

---

## ARCHIVOS CLAVE

```
stress_test.php                                    — 146 tests, 19 fases
tests/Feature/AccesoRolesTest.php                  — 28 tests HTTP reales
app/Http/Controllers/SaleController.php            — origin=credit nace pending, client_name required, pay() usa stock_product_id
app/Http/Controllers/OrderController.php           — collectPending fija accounting_date
app/Http/Controllers/ReportController.php          — buildDayData: costo real boveda_entries
app/Http/Controllers/BovedaController.php          — entrada dual, prorrateo costo, catMap actualizado
app/Http/Controllers/DashboardController.php       — accounting_date, bovedaCategoryMap
app/Http/Controllers/CashRegisterController.php    — route binding corregido, saldo solo cash, amount_bs directo
app/Http/Middleware/EnsureRole.php                 — 409+X-Inertia-Location, sin logout
app/Http/Middleware/EnforceUserSession.php         — X-Inertia-Location en 4 bloques
app/Models/Sale.php                                — accounting_date en $fillable
app/Models/BovedaEntry.php                         — pair_id en $fillable
app/Console/Commands/FetchDollarRate.php           — dollar:fetch command
routes/console.php                                 — scheduler dollar:fetch cada 15 min
routes/web.php                                     — POST /set-branch con middleware rol
resources/js/Pages/Dashboard.vue                   — rediseño completo, Centro de Control, live dot
resources/js/Pages/Boveda/Index.vue                — entrada dual, modal prorrateo, helpSteps actualizado
resources/js/Pages/POS/Index.vue                   — botón bloqueado sin client_name
resources/js/Pages/Settings/Ticket.vue             — 4 campos nuevos con toggle
resources/js/Layouts/AppLayout.vue                 — canEditRate, selector sucursal por rol
```

---

## COMANDOS VPS

```bash
ssh -i C:\Users\carbo\.ssh\id_ed25519 root@187.124.241.213
cd /var/www/syntimeat && git pull origin main && npm run build
php artisan route:clear && php artisan route:cache && php artisan config:cache && php artisan view:clear
# Verificar scheduler activo
crontab -l
# Correr tasa manualmente
php artisan dollar:fetch
```

---

## REGLAS CRÍTICAS

- `accounting_date` es la fecha canónica para reportes — nunca usar `sold_at` ni `created_at`
- Créditos (`origin=credit`): nacen `status=pending` + `payment_status=pendiente_cobro`. Aparecen en reporte solo al cobrar.
- Costo en reporte: última `boveda_entry` por producto — no promedio histórico
- `Sale::find($id)` para leer DB fresca — `->fresh()` solo funciona sobre modelos Eloquent, no sobre arrays JSON
- Carne del Canal: `active=false`, invisible en POS, pool para stock de res
- Fábrica Res: exactamente 4 cortes [Carne del Canal, Costilla, Hueso Redondo, Hueso Rojo]
- POLLO: `requires_despiece=0`, bifurca Tipo A/Tipo B al surtir
- `vitrina_product_id`: campo en `boveda_products`, lookup directo en `surte()`
- Productos "Otro libre": `requires_despiece=false`, match exacto por nombre en vitrina
- Caja: saldo solo suma ventas `type=cash` — pago móvil no afecta saldo efectivo
- NUNCA correr suite completo de tests — solo `--filter` o archivo específico
- NUNCA modificar migraciones ya corridas — crear nuevas

---

*SYNTIdev — synti.dev — Handoff generado: 26 Mayo 2026 (tarde)*
