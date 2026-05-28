# SYNTImeat — Session Handoff
# Fecha: 26 Mayo 2026 (cierre de día — v3 FINAL)
# Estado: PRODUCCIÓN ACTIVA — Sistema listo para cliente

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
| `v1.2-ciclo-caja` | Ciclo completo apertura→venta→corte→cierre |
| `v1.3-stock-pool` | Stock pool — Premium/Primera/Segunda desde Carne del Canal |
| `v1.4` | Dashboard Widget Rendimiento por Canal + Panel Empresarial botones período |

---

## ENTREGADO HOY — RESUMEN COMPLETO

### Flujo de Caja Certificado ✅
- Apertura de caja con monto inicial
- Venta en efectivo → saldo sube
- Venta por pago móvil → NO suma al saldo efectivo (correcto por diseño)
- Retiro manual → descuenta del saldo
- Cierre del día → saldo esperado = exactamente 0 diferencia
- Apertura nueva caja al día siguiente

Fixes aplicados en CashRegisterController:
- Route binding `{register}` vs `$cashRegister` corregido en `movement()` y `confirmClose()`
- `business_id` comparación `==` flexible (evita mismatch tipo string/int)
- Saldo esperado: solo ventas `type=cash` — pago móvil excluido
- Movimientos: `amount_bs` directo (no `amount_usd × rate` — evita drift cambiario)
- Botón cierre: permite efectivo=0
- Return type: `RedirectResponse|JsonResponse` en `movement()`

### Stock Pool Correcto ✅
- `stock_product_id` aplicado en `pay()` de `SaleController`
- Premium, Primera y Segunda descuentan de "Carne del Canal" (pool de res)
- Ingresos de estos cortes contabilizan correctamente en el canal Res

### Widget Rendimiento por Canal ✅ (Dashboard — posición prominente)
- Checkboxes dinámicos por canal: Res, Pollo, Cerdo, Charcutería, Trastes, Víveres
- Tooltip en cada checkbox: "Incluir en análisis"
- Orden de categorías: Res > Pollo > Cerdo > Charcutería > Trastes > Víveres
- Métricas por canal: kg entrada, kg vendidos, costo USD, ingresos USD, utilidad, margen %
- Badge "pasa a mañana" en remanente (stock surtido no vendido hoy)
- Ingresos incluyen Premium/Primera/Segunda vía `stock_product_id`

### Panel Empresarial ✅
- Botones de período rápido: Hoy / Esta semana / Este mes / Personalizado
- Filtro de fecha operativo con los botones

### Infraestructura ✅
- Timezone del servidor: `America/Caracas` — evita drift UTC en `accounting_date`
- `dollar:fetch` scheduler cada 15 minutos (`routes/console.php`)
- Datos demo disponibles para demostración (pendiente limpieza para entrega real)

---

## PRÓXIMO — INMEDIATO

### Antes de entrega al cliente
- [ ] **Limpiar datos demo** — eliminar ventas, entradas de bóveda y registros de demostración
- [ ] Verificar tasa BCV activa en producción
- [ ] Confirmar que `dollar:fetch` está corriendo en el scheduler del VPS (`crontab -l`)

### Mañana — Cliente testea con datos reales
El cliente (Carnicería Chaguaramas) comienza operación real. Monitorear:
- Flujo bóveda → fábrica → vitrina → POS → cierre
- Tasa del día se actualiza automáticamente
- Caja abre y cierra correctamente

---

## DEUDA TÉCNICA PENDIENTE

- [ ] `branch_id` no está en `$fillable` de `Sale` — bug latente si se asigna por masa
- [ ] `console.php` tiene `dollar:update` duplicado (comando no existe — solo `dollar:fetch`)
- [ ] Responsive tablet — certificación visual pendiente
- [ ] Simulador interactivo para inducción del operador (pendiente de diseño)
- [ ] Módulo merma compensada por chorizo (valor agregado — requiere diseño)
- [ ] `.env.testing` con DB separada para aislar Feature Tests de DB real
- [ ] IVA en ticket (futuro — requiere configuración por negocio)
- [ ] QR en ticket (futuro)
- [ ] Tendencia vs ayer en Dashboard — requiere prop `ventas_ayer` en `DashboardController`
- [ ] Debug output en Fase 19.B.2 y 19.C.3 — remover antes de release final
- [ ] Widget Utilidad Real vs Utilidad Potencial por canal (diseño pendiente)
- [ ] Remanente Acumulado por Día — "bola de nieve" semanal/mensual

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
app/Http/Controllers/SaleController.php            — origin=credit nace pending, pay() usa stock_product_id
app/Http/Controllers/OrderController.php           — collectPending fija accounting_date
app/Http/Controllers/ReportController.php          — buildDayData: costo real boveda_entries
app/Http/Controllers/BovedaController.php          — entrada dual, prorrateo costo, catMap actualizado
app/Http/Controllers/DashboardController.php       — accounting_date, Widget Rendimiento por Canal
app/Http/Controllers/CashRegisterController.php    — route binding corregido, saldo solo cash, amount_bs directo
app/Http/Middleware/EnsureRole.php                 — 409+X-Inertia-Location, sin logout
app/Http/Middleware/EnforceUserSession.php         — X-Inertia-Location en 4 bloques
app/Models/Sale.php                                — accounting_date en $fillable
app/Models/BovedaEntry.php                         — pair_id en $fillable
app/Console/Commands/FetchDollarRate.php           — dollar:fetch command
routes/console.php                                 — scheduler dollar:fetch cada 15 min
routes/web.php                                     — POST /set-branch con middleware rol
resources/js/Pages/Dashboard.vue                   — Widget Rendimiento por Canal, orden categorías, Centro de Control
resources/js/Pages/Reports/Empresarial.vue         — botones período rápido
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
# Verificar timezone
php artisan tinker --execute="echo config('app.timezone');"
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
- Timezone: `America/Caracas` — crítico para `accounting_date` correcto
- NUNCA correr suite completo de tests — solo `--filter` o archivo específico
- NUNCA modificar migraciones ya corridas — crear nuevas

---

*SYNTIdev — synti.dev — Handoff FINAL generado: 26 Mayo 2026 (cierre de día)*
