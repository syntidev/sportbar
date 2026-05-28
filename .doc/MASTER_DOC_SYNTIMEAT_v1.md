# MASTER DOC — SYNTImeat v1
# Sistema POS para Carnicería Chaguaramas — Valle de la Pascua, Venezuela
# Generado: 28 Mayo 2026 | Estado: PRODUCCIÓN ACTIVA

---

## 1. VISIÓN Y CLIENTE PILOTO

### El producto

SYNTImeat es un POS (Point of Sale) especializado para carnicerías venezolanas,
construido sobre la premisa de que una carnicería no vende productos terminados:
**transforma materia prima en cortes**, y cada paso de esa transformación
tiene un costo que debe rastrearse con precisión para calcular utilidad real.

El sistema modela el ciclo completo de la carne:
**Bóveda (canal vivo) → Fábrica (despiece) → Vitrina (cortes) → POS (venta) → Cierre (contabilidad)**

La moneda operativa es bolivar (Bs.) pero toda la contabilidad de costos e
ingresos vive en USD, con conversión dinámica desde la tasa BCV actualizada
cada 15 minutos. Esta dualidad de moneda es crítica para el contexto venezolano.

### Cliente piloto

**Carnicería Chaguaramas**
- Propietario / contacto de negocio: Daniel Cheein (análogo al rol de operación diaria)
- Ubicación: Valle de la Pascua, estado Guárico, Venezuela
- Operación: carnicería con múltiples sucursales en perspectiva (piloto en sucursal única)
- Canal de carne primario: Res (Medio Canal), Pollo Entero Congelado, Cerdo Canal, Jamón Pierna Sellado
- Categorías activas: Res, Pollo, Cerdo, Charcutería, Trastes, Víveres

### Infraestructura de producción

| Campo           | Valor                                              |
|-----------------|----------------------------------------------------|
| URL producción  | https://meat.synti.cloud                           |
| VPS             | 187.124.241.213 — Ubuntu 24.04 — Hostinger KVM1   |
| Repo            | https://github.com/syntidev/syntimeat (branch: main) |
| DB producción   | syntimeat_db / syntimeat / SyntiMeat2026!          |
| Local dev       | C:\laragon\www\syntimeat                           |
| Super admin     | carbolivar@gmail.com (is_hidden=1, ID=20)          |

### Tags de restauración (git)

| Tag                   | Descripción                                                       |
|-----------------------|-------------------------------------------------------------------|
| `v1.0-certificado`    | Aritmética contable — Wave 1-5 + Fase 19 stress_test 146/146     |
| `v1.1-caja-certificada` | Flujo de caja completo certificado                              |
| `v1.2-ciclo-caja`     | Ciclo completo apertura→venta→corte→cierre                        |
| `v1.3-stock-pool`     | Stock pool — Premium/Primera/Segunda desde Carne del Canal        |
| `v1.4`                | Dashboard Widget Rendimiento por Canal + Panel Empresarial        |

---

## 2. STACK TECNOLÓGICO

### Core

| Capa              | Tecnología                                      | Versión / Notas                              |
|-------------------|-------------------------------------------------|----------------------------------------------|
| Backend framework | Laravel                                         | 13.8 (PHP 8.3+)                              |
| SPA bridge        | Inertia.js                                      | Renderiza vistas Vue sin API REST separada   |
| Frontend          | Vue 3 (Composition API)                         | `<script setup>` en todas las páginas        |
| CSS               | Tailwind CSS 4                                  | Config purge activa en build                 |
| Animaciones       | Motion One                                      | Transiciones de UI ligeras                   |
| ORM               | Eloquent (Laravel)                              | Eager loading obligatorio — sin N+1          |
| DB                | MySQL 8                                         | En VPS Hostinger KVM1                        |
| Autenticación     | Laravel Breeze (Fortify + sesiones)             | PIN no implementado — email/password         |
| Tareas programadas| Laravel Scheduler (cron en VPS)                 | `dollar:fetch` cada 15 min                   |
| Build assets      | Vite + npm run build                            | Obligatorio en VPS tras cambio Vue           |
| Deploy            | Git pull + migrate + config:cache               | Manual vía SSH                               |
| Servidor web      | Nginx + PHP-FPM                                 | En Ubuntu 24.04                              |

### Capa de moneda (externa)

| Servicio             | Rol                                                              |
|----------------------|------------------------------------------------------------------|
| SYNTIcorex DB        | Conexión readonly — fuente de `dollar_rates`                     |
| dolarapi.com         | Fuente primaria para tasa BCV USD                                |
| brecha-cambiaria.com | Fuente secundaria — fallback si dolarapi falla                   |
| DollarRateService    | Servicio interno — abstrae la fuente, entrega `float` de tasa    |

### Patrones de arquitectura activos

- **Server-side routing**: todas las rutas son Laravel (`web.php`), Inertia inyecta props
- **Shared props**: `HandleInertiaRequests` inyecta `auth.user`, tasa del día, alertas bancarias en CADA request
- **Pool de stock** (`stock_product_id`): patrón por el que productos derivados (Premium, Primera, Segunda)
  descontan inventario del producto padre (Carne del Canal) en lugar de sí mismos
- **accounting_date**: campo canónico para contabilidad — fecha del día en Venezuela (no UTC), crítico
  cuando las ventas ocurren cerca o después del corte bancario (7pm)

---

## 3. ARQUITECTURA DE FLUJO — BÓVEDA → FÁBRICA → VITRINA → POS → CIERRE

El flujo es lineal y cada etapa tiene su controlador dedicado. No se puede
saltar etapas: no se puede vender lo que no ha pasado por vitrina.

### 3.1 Bóveda (`BovedaController`)

La bóveda es el punto de entrada de materia prima. Un canal de res, un lote de pollos,
un canal de cerdo. Cada entrada (`BovedaEntry`) registra:

- `product_type` (ej. `RES - Medio Canal`)
- `kg_entrada` — kilos brutos que entran
- `costo_usd` — costo de compra en USD
- `kg_surtido_vitrina` — lo que ya pasó a la siguiente etapa
- `waste_kg` — merma acumulada
- `kg_disponible` — campo `GENERATED VIRTUAL` = `kg_entrada - kg_surtido_vitrina - waste_kg`

**Caso especial — Canal 1 / Canal 2 (pair_id):**
Cuando se registra `RES - Medio Canal` con el flag `con_canal_2`, el controlador
crea DOS `BovedaEntry` simultáneamente con `pair_id` cruzado. El costo total se
prorratea por peso entre ambas entradas. Esto modela la realidad de que un canal
de res físico llega en dos mitades.

**Cierre automático:** cuando `surte()` lleva el `kg_disponible` a 0, la entrada
se cierra automáticamente (`closed_at = now()`).

### 3.2 Fábrica (`FabricaController`)

La fábrica convierte la entrada de bóveda en cortes para vitrina mediante el despiece.

Para **Res y Cerdo** (`requires_despiece = true`): el operador registra cuántos kg
de cada corte salieron del canal. Los 4 cortes válidos de Res son exactamente:
`['Carne del Canal', 'Costilla', 'Hueso Redondo', 'Hueso Rojo']`.
Premium, Primera y Segunda **no aparecen en la pantalla de despiece** — están
en vitrina pero su stock es el pool de `Carne del Canal`.

Para **Pollo y Jamón** (`requires_despiece = false`): el surtido es directo.
El sistema busca el `vitrina_product_id` registrado en el `BovedaProduct`
y crea la `InventoryEntry` de vitrina sin paso intermedio de despiece.
En Pollo además bifurca entre **Tipo A** (pollo completo) y **Tipo B**
(piezas/presas) según la configuración del producto vitrina.

### 3.3 Vitrina (Inventario)

`InventoryEntry` es la tabla que acumula el stock disponible para venta.
Cada registro tiene `product_id`, `quantity_kg`, `waste_kg` y `net_kg`
(campo virtual DB = `quantity_kg - waste_kg`).

El `stockMap` que ve el POS es la suma de todos los `net_kg` por `product_id`
para el negocio. El POS consulta esto en cada apertura de sesión.

### 3.4 POS (`SaleController`)

El flujo de una venta en POS tiene dos pasos explícitos:

1. **`store()`** — crea la venta con `status = 'open'`. No descuenta stock aquí.
   Genera el `ticket_number` con el prefijo del negocio. Para ventas a crédito
   (`origin = credit`), nace con `status = pending` y `payment_status = pendiente_cobro`.
   El cliente debe tener `client_name` registrado para créditos.

2. **`pay()`** — cobra la venta, registra los `SalePayment`, descuenta inventario
   creando `InventoryEntry` con `quantity_kg` negativo. Aquí se aplica el
   `stock_product_id`: si el producto tiene pool, el descuento va al pool, no al producto.
   El saldo de la caja **solo sube si el método de pago es `type = cash`**.
   Los pagos móviles y transferencias no afectan el saldo efectivo de la caja.

**Pago mixto:** una sola venta puede pagarse con múltiples métodos.
Cada método genera un registro `SalePayment` independiente.
La validación exige que la suma de `amount_bs` cubra el `total_bs`.

### 3.5 Cierre (`CashRegisterController`)

El ciclo de caja tiene cinco operaciones:

1. `open()` — registra monto inicial en Bs.
2. Ventas durante el día — suman o no suman saldo según tipo de pago
3. `movement()` — retiros (`out`), ingresos (`in`) o cortes (`corte`) manuales.
   Todos usan `amount_bs` directo, nunca `amount_usd × rate` (evita drift cambiario).
4. `dayClose()` — pantalla de resumen — saldo esperado vs saldo contado
5. `confirmClose()` — sella la caja con `closed_at` y registra la diferencia

**Saldo esperado = opening_amount_bs + ventas_cash_bs + movimientos_in_bs - movimientos_out_bs**

Una caja con efectivo = 0 puede cerrarse (operaciones solo digitales).

---

## 4. ROLES Y PERMISOS

### Roles activos en el sistema

| Rol           | Descripción                                                                    |
|---------------|--------------------------------------------------------------------------------|
| `super_admin` | Desarrollador / SYNTIdev — acceso total, `is_hidden=1` en producción           |
| `owner`       | Dueño del negocio — acceso total operativo + Panel Empresarial multi-sucursal  |
| `branch_admin`| Administrador de sucursal — igual que owner pero limitado a su sucursal        |
| `supervisor`  | Supervisión operativa — POS, reportes, bóveda, fábrica, inventario             |
| `analyst`     | Contabilidad — reportes, historial de ventas, cajas, sin acceso a POS activo   |
| `cashier`     | Cajero — solo POS, caja, pedidos, clientes                                     |
| `admin`       | Admin interno — casi todo excepto features exclusivos de super_admin           |

### Permisos por módulo (AppLayout.vue — `rolePermissions`)

```javascript
const rolePermissions = {
    super_admin:  // todos los módulos + settings.users
    owner:        ['dashboard','pos','inventory','boveda','fabrica','orders',
                   'sales','dayclose','catalog','clients','contingency',
                   'users','settings','cash'],
    branch_admin: // igual que owner
    supervisor:   ['dashboard','pos','cash','sales','dayclose','inventory',
                   'catalog','boveda','fabrica','orders','clients','reports','contingency'],
    analyst:      ['dashboard','sales','dayclose','cash','reports','inventory',
                   'catalog','clients','orders','contingency'],
    cashier:      // pos, caja, pedidos, clientes
}
```

**Navegación diferenciada:** `owner` y `branch_admin` ven `navOwner`, que prioriza
el Panel Empresarial en la parte superior del menú.

**Selector de sucursal:** solo visible en `AppLayout` para roles con acceso
multi-sucursal. El `cashier` queda fijo a su sucursal asignada.

### Middleware de control de acceso

| Middleware             | Alias               | Comportamiento                                                              |
|------------------------|---------------------|-----------------------------------------------------------------------------|
| `EnsureRole`           | `role`              | Verifica `user->role` en lista permitida. Devuelve 409 + `X-Inertia-Location` si falla (sin logout) |
| `CheckOnboarding`      | `check.onboarding`  | Redirige a `/setup` si `business.onboarding_completed = false`              |
| `EnforceUserSession`   | global              | Cuatro bloques de validación: activo, token único, días habilitados, ventana horaria |
| `CheckSubscription`    | `subscription`      | Kill switch: si `business.subscription_active = false` → logout + mensaje   |
| `HandleInertiaRequests`| global              | Inyecta auth.user, flash, tasa, banking_alert en shared props               |

**Stack middleware autenticado:** `['auth', 'verified', 'check.onboarding', 'subscription']`

---

## 5. FEATURE ÚNICO — SESIÓN POR HORARIO (EnforceUserSession.php)

Este es el diferenciador técnico más importante del sistema frente a un POS genérico.
Cada usuario tiene configurada una **ventana de acceso temporal** a nivel de registro:

```php
// Campos en users:
access_start  // TIME — hora de inicio del turno, ej. "07:00:00"
access_end    // TIME — hora de fin del turno, ej. "15:00:00"
access_days   // JSON array — días habilitados, ej. ["monday","tuesday","wednesday"]
is_active     // boolean — kill switch individual
session_token // string — token de sesión única
```

### Los cuatro bloques de validación de EnforceUserSession

El middleware se ejecuta en cada request autenticado y verifica en secuencia:

1. **Bloque activo**: si `is_active = false`, redirige a login con mensaje
   "Cuenta suspendida. Contacte al administrador."

2. **Sesión única por token**: si el `session_token` del usuario difiere del que
   está en la sesión activa del navegador, redirige a login con mensaje
   "Tu sesión fue iniciada en otro dispositivo." Este mecanismo previene
   que dos sesiones paralelas existan para el mismo usuario.

3. **Días habilitados**: si `access_days` está configurado y el día actual
   (en timezone `America/Caracas`) no está en el array, redirige con mensaje
   "No tienes acceso los [día]."

4. **Ventana horaria**: si `access_start` y `access_end` están configurados
   y la hora actual está fuera del rango, redirige con mensaje
   "Tu turno es de HH:MM a HH:MM."

En todos los casos el middleware responde con `X-Inertia-Location` en lugar de
un redirect HTTP plano, garantizando que Inertia.js haga la navegación correcta
sin romper el estado del SPA.

### Casos de uso operativo

Este feature resuelve un problema real de carnicería: el turno matutino (cajero de 7am-3pm)
no debe poder entrar al sistema a las 11pm y hacer ventas fraudulentas.
El dueño configura los accesos desde el panel de usuarios sin intervención técnica.

### Branch a nivel de usuario

Además del horario, cada usuario tiene `branch_id` que lo ata a una sucursal.
Los filtros de datos en `DashboardController`, `ReportController` y `SaleController`
aplican este campo: un cajero de sucursal A no ve los datos de la sucursal B.
`owner` y `super_admin` tienen `seesTodasLasSucursales() = true`.

---

## 6. MÓDULO DE COBROS — MÉTODOS DE PAGO DINÁMICOS Y DISPOSITIVOS POS

### Métodos de pago (`PaymentMethod`)

Los métodos de pago no son hardcodeados: cada negocio los gestiona desde
Configuración → Métodos de Pago. El modelo tiene:

```
business_id, name, type, bank_name, is_active, sort_order
```

Los métodos base sembrados en producción (Chaguaramas):
- Efectivo Bs.
- Efectivo USD
- Transferencia
- Pago Móvil
- Punto de Venta (BioPago / terminal física)

**Regla crítica de caja**: solo los métodos con `type = 'cash'` suman al saldo
efectivo de la `CashRegister`. Los métodos digitales (transferencia, pago móvil,
punto) quedan registrados en `SalePayment` para reportes pero no afectan el
arqueo de efectivo.

**Reordenamiento**: el endpoint `POST /configuracion/metodos-pago/reorder` permite
arrastrar y soltar el orden de aparición en el POS, guardando `sort_order`.

### Terminales / Dispositivos (`PaymentTerminal`)

Además de los métodos, existe la entidad `PaymentTerminal` para registrar
los dispositivos físicos por sucursal (lectores BioPago, puntos de venta bancarios):

```
business_id, branch_id, name, type, bank_name, is_active
```

Cuando el cajero selecciona "Punto de Venta" como método de pago, el POS
muestra la lista de terminales disponibles para la sucursal, permitiendo
registrar cuál terminal procesó la transacción.

### Pago a crédito (`origin = credit`)

Una venta puede nacer como crédito cuando el cliente no paga en el momento.
El flujo es diferente:

1. `store()` con `origin = credit` → `status = pending`, `payment_status = pendiente_cobro`
2. El cliente aparece en la lista de cobros pendientes
3. Cuando paga, `OrderController::collectPending()` fija `accounting_date` y
   registra los pagos — la venta recién aparece en los reportes contables

Este mecanismo es fundamental para negocios con clientes habituales que llevan
una cuenta corriente informal.

---

## 7. CAJAS REGISTRADORAS POR SUCURSAL

### Modelo CashRegister

```php
// Campos clave
business_id, branch_id, name,
opened_at (nullable), closed_at,
opening_amount_usd (nullable), opening_amount_bs,
expected_cash_usd, counted_cash_usd, difference_usd,
rate_at_opening,
opened_by (nullable), closed_by
```

### Invariantes del módulo de caja

**Una caja activa por vez por sucursal**: el sistema no impide crear múltiples cajas,
pero la vista de POS toma `CashRegister::where(...)->whereNull('closed_at')->first()`.
El operador debe cerrar la caja del día antes de abrir otra.

**No se puede vender sin caja abierta**: `pay()` verifica caja activa antes de
procesar el pago. Si no hay caja, devuelve error JSON `{error: 'No hay caja abierta'}`.

**Movimientos de caja** (`CashMovement`): tres tipos:
- `in` — ingreso manual (ej. fondo de caja reabastecido)
- `out` — retiro (ej. pago a proveedor en efectivo)
- `corte` — corte de caja intermedio (saldo sube en reportes pero no cierra la caja)

**Saldo directo en Bs**: todos los `amount_bs` de movimientos se guardan directamente
en bolivares. Nunca se guarda `amount_usd` y se recalcula al momento de lectura.
Esto evita el "drift" cambiario donde un movimiento registrado a tasa 40 se
recalcula incorrectamente a tasa 45 al día siguiente.

### Alerta de corte bancario

El scheduler ejecuta `cash:banking-alert` a las 6:40pm, 6:50pm y 7:00pm:

```bash
php artisan cash:banking-alert --minutes=20
php artisan cash:banking-alert --minutes=10
php artisan cash:banking-alert --minutes=0
```

Cada ejecución escribe en caché `banking_alert`. `HandleInertiaRequests`
lo inyecta en shared props y `AppLayout.vue` lo renderiza como banner global
en el POS, avisando al cajero que debe anticipar el corte bancario antes de las 7pm.

---

## 8. SISTEMA DE MONEDA — DollarRateService + SCHEDULER

### Arquitectura de la tasa

SYNTImeat consume la tasa desde la base de datos de SYNTIcorex (proyecto hermano).
La conexión está definida en `.env` como `SYNTIWEB_DB_*` y es estrictamente
**readonly** — SYNTImeat nunca escribe en esa conexión.

```php
// config/database.php
'synticorex' => [
    'driver'   => 'mysql',
    'host'     => env('SYNTIWEB_DB_HOST'),
    'database' => env('SYNTIWEB_DB_DATABASE'),
    // ...
]
```

El modelo `DollarRate` usa esta conexión y tiene `UPDATED_AT = null`
(la tabla no usa timestamps de Laravel).

### DollarRateService — API pública

| Método                  | Firma                                            | Propósito                                                       |
|-------------------------|--------------------------------------------------|-----------------------------------------------------------------|
| `getTodayRate()`        | `(string $source = 'bcv'): float`                | Tasa del día. Fallback a última disponible si no hay rate hoy   |
| `getLatestRate()`       | `(string $source = 'bcv'): float`                | Última tasa activa sin importar fecha                           |
| `fetchAndStore()`       | `(): array{success, rate?, source?, message}`    | Consulta APIs externas y persiste nueva tasa USD en synticorex  |
| `storeManualRate()`     | `(float $rate): bool`                            | Permite al admin sobreescribir la tasa del día                  |
| `formatBs()`            | `(float $usd, float $rate): float`               | `usd × rate`, redondeado a 2 decimales                          |

**Constantes críticas:**
- `FALLBACK = 40.00` — tasa de último recurso si todo falla
- `MAX_CHANGE_PCT = 60%` — variación máxima tolerable entre dos tasas consecutivas
- `CACHE_TTL = 3600s` — caché en memoria para reducir hits a DB

### Scheduler — `dollar:fetch` cada 15 minutos

```php
// routes/console.php
Schedule::command('dollar:fetch')->everyFifteenMinutes();
```

Este comando invoca `CurrencyFetcherService::fetchUSD()` que intenta:
1. `dolarapi.com` — fuente primaria BCV
2. `brecha-cambiaria.com` — fallback

Si ambas fuentes fallan, el sistema usa la última tasa disponible en DB.
La operación **nunca bloquea** — si no hay tasa, se usa el fallback.

### Tasa manual desde UI

El endpoint `POST /tasa/manual` permite a `super_admin`, `owner`, `branch_admin`
o `analyst` sobreescribir la tasa del día sin pasar por el scheduler.
Útil cuando la tasa BCV tiene latencia o hay diferencia con la tasa de mercado.

El campo `canEditRate` en `AppLayout.vue` controla la visibilidad del botón
según el rol del usuario.

---

## 9. SUITE DE TESTS — CERTIFICACIÓN 146/146 + 28/28

### stress_test.php — 19 Fases, 146 tests

El archivo `stress_test.php` (raíz del proyecto) es un test de integración
que simula un día completo de operación de carnicería. Se ejecuta directamente
como script PHP y usa el bootstrap de Laravel para acceder a modelos y controllers
reales contra la base de datos de producción (o staging).

**Invocación:** `php stress_test.php`
**Output:** tabla ASCII + `stress_output.txt` al finalizar
**Convención:** todos los fixtures creados llevan prefijo `[ST-HHMMSS]` para cleanup automático al final.

| Fase | Módulo                              | Tests   | Estado |
|------|-------------------------------------|---------|--------|
| 1    | Auth + DollarRateService            | 2       | ✅ PASS |
| 2    | Bóveda: entradas, surtidos, límites | 10      | ✅ PASS |
| 3    | Fábrica: despiece y validaciones    | 5       | ✅ PASS |
| 4    | POS: ventas, pagos, anulaciones     | 17      | ✅ PASS |
| 5    | Cierre de caja y utilidad           | 4       | ✅ PASS |
| 6    | InventoryController                 | 3       | ✅ PASS |
| 7    | OrderController                     | 8       | ✅ PASS |
| 8    | ClientController                    | 4       | ✅ PASS |
| 9    | ReportController                    | 6       | ✅ PASS |
| 10   | SettingsController + PaymentMethods | 8       | ✅ PASS |
| 11   | Configuración Ticket                | 4       | ✅ PASS |
| 12   | Configuración General               | 3       | ✅ PASS |
| 13   | Sucursales (storeBranch)            | 3       | ✅ PASS |
| 14   | Contingencia (importSales)          | 4       | ✅ PASS |
| 15   | Dashboard data endpoint             | 5       | ✅ PASS |
| 16   | CatalogController::importProducts() | 6       | ✅ PASS |
| 17   | FabricaController (RES/POLLO/CERDO) | 9       | ✅ PASS |
| 18   | Config CRUD completo                | parcial | ⚠️ En desarrollo |
| 19   | Aritmética contable Wave 1-5        | 55      | ✅ PASS |

**Total certificado: 146/146 PASS**

### Qué certifica específicamente cada área crítica

**Fase 2 — Bóveda**: valida que no se puede surtir más kg de los disponibles,
que no se pueden surtir 0 o negativos, que una entrada cerrada rechaza surtidos,
y que al llegar a 0 kg disponibles la entrada se cierra automáticamente.

**Fase 4 — POS**: 10 ventas consecutivas para detectar race conditions en
generación de `ticket_number`, pago mixto (dos métodos en una venta),
pago insuficiente rechazado, doble anulación rechazada, reverso de inventario
en `void()`, y venta con pool `stock_product_id`.

**Fase 5 — Caja**: cálculo de utilidad bruta (`ventas_usd - costo_boveda_usd`),
cierre de caja con diferencia = 0, doble cierre rechazado.

**Fase 19 — Aritmética contable**: 55 tests numéricos que verifican que
costos, ingresos, utilidades y márgenes cuadran centavo a centavo usando
`accounting_date` como fecha canónica.

### AccesoRolesTest.php — 28 tests HTTP reales

Tests Feature de Laravel que verifican que cada rol solo accede a las rutas
que le corresponden. Usa `loginUsingId` dinámico:

```php
// NUNCA hardcoded ID=1 — siempre dinámico:
User::where('role', 'super_admin')->where('is_hidden', 0)->value('id')
```

`phpunit.xml` tiene `DB_DATABASE :memory:` **eliminado** — usa MySQL real.
Esto garantiza que las migraciones reales y los datos de producción estén
presentes durante los tests de roles.

**NUNCA ejecutar:**
```bash
php artisan test                            # borra DB con RefreshDatabase
php artisan test --testsuite=Feature        # ídem
```

**Siempre ejecutar con filtro:**
```bash
php artisan test --filter AccesoRolesTest
php artisan test --filter NombreDelTestEspecifico
```

---

## 10. PROTOCOLO IRROMPIBLE DE DESARROLLO

Estas reglas no son sugerencias. Cada una surgió de un bug real en producción.

### CLI dual — auditaría antes de ejecutar

El flujo de trabajo estándar usa dos instancias de terminal:
- **CLI-A** (consulta): leer archivos, analizar, nunca tocar código
- **CLI-B** (ejecuta): implementar lo acordado, jamás inferir cambios de scope

Nunca abrir CoWork sin el prompt completo del contexto de la sesión.
Los session handoffs existen exactamente para esto.

### Reglas de tests

```bash
# PROHIBIDO — borra toda la DB con RefreshDatabase:
php artisan test
php artisan test --testsuite=Feature

# OBLIGATORIO — siempre con filtro:
php artisan test --filter NombreEspecifico
php stress_test.php

# Certificación antes de cualquier commit:
stress_test.php 146/146 ✅ + AccesoRolesTest 28/28 ✅
```

### Reglas de deploy en VPS

```bash
# Obligatorio en este orden exacto tras cambio Vue:
npm run build

# Obligatorio tras cambio de rutas o config:
php artisan route:clear && php artisan route:cache
php artisan config:cache
php artisan view:clear

# NUNCA modificar migraciones ya corridas — siempre crear nueva migración
```

### Reglas de código

```php
// CORRECTO — leer Sale fresco desde DB:
$sale = Sale::find($id);

// INCORRECTO — fresh() no funciona sobre arrays JSON decodificados:
$sale = json_decode($response, true);
$sale = (object)$sale;
$sale->fresh(); // FALLA SILENCIOSAMENTE

// CORRECTO — loginUsingId dinámico:
Auth::loginUsingId(User::where('role','super_admin')->where('is_hidden',0)->value('id'));

// INCORRECTO — ID hardcodeado (roto si se regenera el seeder):
Auth::loginUsingId(1);
```

### Regla de timezone

El servidor debe tener `APP_TIMEZONE = America/Caracas` en el `.env`
y verificarse con:

```bash
php artisan tinker --execute="echo config('app.timezone');"
```

Sin esto, `accounting_date` se calculará en UTC y las ventas nocturnas
(después de las 8:30pm hora Venezuela) quedarán contabilizadas en el día siguiente.

---

## 11. DEUDA TÉCNICA ACTIVA

### BUGs críticos (activos)

| ID      | Descripción                                                                                                                  | Impacto |
|---------|------------------------------------------------------------------------------------------------------------------------------|---------|
| BUG-001 | Productos duplicados en vistas — filtro `branch_id` falla cuando la sesión tiene `branch_id = null`                         | Alto    |
| BUG-002 | Producto creado no aparece en Catálogo — `CatalogController` no asigna `branch_id` correctamente al crear                   | Alto    |

### Deuda técnica V1.1 (acordada con cliente, pendiente de sprint)

| Ítem                                              | Descripción                                                                       |
|---------------------------------------------------|-----------------------------------------------------------------------------------|
| `branch_id` en `$fillable` de `Sale`              | Bug latente — si se intenta asignar `branch_id` por mass assignment, falla        |
| `dollar:update` duplicado en `console.php`        | Comando que no existe (solo existe `dollar:fetch`) — produce error en scheduler   |
| Responsive tablet                                 | Certificación visual pendiente — pantallas entre 768-1024px no auditadas          |
| Simulador operador                                | Inducción interactiva para nuevos cajeros — requiere diseño UX                    |
| Módulo merma / chorizo                            | Valor agregado: compensar merma con producción de chorizo — requiere diseño       |
| `.env.testing` con DB separada                    | Aislar Feature Tests de DB real — actualmente los tests tocan MySQL de producción |
| IVA en ticket                                     | Futuro — requiere campo `iva_pct` configurable por negocio                        |
| QR en ticket                                      | Futuro — link al historial de compra del cliente                                  |
| Tendencia vs ayer en Dashboard                    | Requiere prop `ventas_ayer` en `DashboardController`                              |
| Debug output en Fase 19.B.2 y 19.C.3             | Líneas de `echo` para debug — remover antes de release final                      |
| Widget Utilidad Real vs Utilidad Potencial        | Gap entre lo vendido y lo que pudo venderse — requiere diseño                     |
| Remanente Acumulado por Día ("bola de nieve")     | Gráfico de línea semanal/mensual — base para proyecciones de flujo de caja        |
| Corte bancario configurable desde UI              | Hoy es hardcoded a 7pm — debe ser configurable por negocio                        |
| Reportes por cajero / por método de pago          | Filtros adicionales en ReportController                                            |
| Paginación en reportes                            | Hoy cap 500 filas — necesita paginación para volúmenes reales                     |
| CRUD Proveedores                                  | Hoy se ingresa texto libre — necesita entidad `Supplier` con historial            |
| Email / reset de contraseña                       | Requiere configurar Resend o similar como mail driver                              |
| Logo en ticket impreso                            | Campo ya existe en business — renderización en PDF pendiente                      |
| Scanner EAN-13 con balanza real                   | Calibración pendiente con hardware físico del cliente                             |
| Ticket térmico 80mm                               | Calibración pendiente con impresora real de Chaguaramas                           |
| FASE 18 stress_test completa                      | Config CRUD completo — en desarrollo                                               |
| FASE 19/20 stress_test                            | Multi-rol y multi-sucursal — pendientes                                           |

---

## 12. COMANDOS VPS — PRODUCCIÓN

### Conexión y despliegue básico

```bash
# Conectar al VPS
ssh -i C:\Users\carbo\.ssh\id_ed25519 root@187.124.241.213

# Deploy completo (orden OBLIGATORIO)
cd /var/www/syntimeat
git pull origin main
npm run build
php artisan migrate --force
php artisan route:clear && php artisan route:cache
php artisan config:cache
php artisan view:clear
```

### Kill switch del sistema

```bash
# Apagar acceso a todos los usuarios (mantenimiento / mora)
php artisan tinker --execute="DB::table('businesses')->where('id',1)->update(['subscription_active'=>0]);"

# Reactivar
php artisan tinker --execute="DB::table('businesses')->where('id',1)->update(['subscription_active'=>1]);"
```

### Sistema de moneda

```bash
# Actualizar tasa BCV manualmente
php artisan dollar:fetch

# Verificar que el scheduler está activo en cron
crontab -l
# Debe mostrar: * * * * * cd /var/www/syntimeat && php artisan schedule:run >> /dev/null 2>&1
```

### Alerta bancaria (cron específico — 6:40pm, 6:50pm, 7:00pm)

```bash
php artisan cash:banking-alert --minutes=20
php artisan cash:banking-alert --minutes=10
php artisan cash:banking-alert --minutes=0
```

### Diagnóstico

```bash
# Ver últimas 50 líneas de logs
tail -50 storage/logs/laravel.log

# Filtrar solo errores
grep "ERROR\|Exception" storage/logs/laravel.log | tail -20

# Verificar timezone del servidor
php artisan tinker --execute="echo config('app.timezone');"

# Verificar tasa activa
php artisan tinker --execute="echo app(\App\Services\DollarRateService::class)->getTodayRate();"
```

### Tests en VPS (emergencia — solo con filtro)

```bash
# NUNCA sin --filter
php artisan test --filter AccesoRolesTest
php stress_test.php
```

---

## 13. REGLAS CRÍTICAS DE NEGOCIO

Estas reglas son irrompibles. Violarlas produce datos contables incorrectos
o comportamiento inesperado en producción.

### Contabilidad y fechas

**`accounting_date` es la fecha canónica — NUNCA `sold_at` ni `created_at`.**
Esta fecha es la que determina en qué día aparece una venta en los reportes.
Para ventas antes de las 7pm, `accounting_date = fecha_actual_Venezuela`.
Para ventas después del corte bancario, `accounting_date = día_siguiente`.
`OrderController::collectPending()` fija `accounting_date` al momento de cobro,
no al momento de creación del crédito.

**Créditos**: nacen con `status = pending` + `payment_status = pendiente_cobro`.
No aparecen en reportes de ventas hasta que se cobran efectivamente.
`client_name` es **obligatorio** para ventas de crédito — el POS bloquea el botón.

**Costo en reportes**: se usa siempre la **última `BovedaEntry`** por producto
como referencia de costo. No se hace promedio histórico. Si el proveedor subió
el precio ayer, el costo de hoy usa ese precio nuevo.

### Stock y inventario

**`stock_product_id` — el pool de res:**
Los productos Premium, Primera y Segunda tienen `stock_product_id` apuntando
a "Carne del Canal". Esto significa:
- `pay()` en `SaleController` descuenta el stock de `Carne del Canal`, no del corte vendido
- `buildDayData()` en `ReportController` calcula el costo usando `Carne del Canal`
- Los ingresos de Premier/Primera/Segunda se contabilizan en el canal Res

**"Carne del Canal"** tiene `active = false` — es invisible en el POS.
Solo existe como pool contable. Si se elimina o renombra, el pool de stock queda roto.

**`Sale::find($id)` para refrescar modelos** — `->fresh()` solo funciona sobre
instancias Eloquent, no sobre arrays decodificados desde JSON. Si se obtiene
un `$sale` desde `json_decode($response->getContent(), true)`, hacer
`Sale::find($body['sale']['id'])` para obtener el modelo real y fresco.

### Fábrica y despiece

**Fábrica Res — exactamente 4 cortes**: `['Carne del Canal', 'Costilla', 'Hueso Redondo', 'Hueso Rojo']`.
Este array es el `$resOrder` que filtra la pantalla de despiece. Premium, Primera y Segunda
no aparecen aquí — se asignan desde catálogo y tienen `stock_product_id`.

**POLLO — `requires_despiece = false`**: el pollo no pasa por fábrica de despiece.
Se surtit directamente a vitrina. Al surtir, bifurca entre **Tipo A** (pollo entero)
y **Tipo B** (presas/piezas) según el `vitrina_product_id` configurado en el
`BovedaProduct`. Si no hay `vitrina_product_id` configurado, el surtido falla.

**`pair_id` en res Canal 1 / Canal 2**: cuando un canal de res llega en dos mitades,
el sistema crea dos `BovedaEntry` con `pair_id` cruzado. El costo total se proratea
por peso entre ambas entradas. Ambas entradas deben estar activas para el despiece.

**`vitrina_product_id`**: campo en `BovedaProduct` que hace el lookup directo
en `surte()`. El match es por `ID`, no por nombre. Si el catálogo de vitrina
cambia de ID (por reimportación), este campo debe actualizarse.

**Productos "Otro libre"** (`requires_despiece = false` + sin `vitrina_product_id`):
el surtido usa match exacto por nombre entre `product_type` de la entrada bóveda
y el `name` del producto vitrina. Cualquier diferencia en mayúsculas, tildes o
espacios rompe el surtido.

### Caja y pagos

**Saldo efectivo = solo ventas `type = cash`**. Pago móvil, transferencia y
punto de venta NO afectan el saldo de efectivo de la caja. Esto es por diseño:
el arqueo de caja solo cuenta el dinero físico.

**`amount_bs` directo en movimientos** — nunca `amount_usd × rate_actual`.
La tasa del momento de la transacción queda implícita en el monto Bs registrado.
Recalcular con una tasa posterior introduce drift cambiario.

---

## ARCHIVOS CLAVE DEL SISTEMA

```
stress_test.php                                    — 146 tests, 19 fases
tests/Feature/AccesoRolesTest.php                  — 28 tests HTTP reales
app/Http/Controllers/SaleController.php            — origin=credit, pay() pool stock_product_id
app/Http/Controllers/OrderController.php           — collectPending fija accounting_date
app/Http/Controllers/ReportController.php          — buildDayData: costo real boveda_entries
app/Http/Controllers/BovedaController.php          — entrada dual pair_id, prorrateo costo
app/Http/Controllers/FabricaController.php        — despiece, catMap, resOrder 4 cortes
app/Http/Controllers/DashboardController.php       — accounting_date, Widget Rendimiento Canal
app/Http/Controllers/CashRegisterController.php    — route binding, saldo solo cash, amount_bs directo
app/Http/Middleware/EnsureRole.php                 — 409 + X-Inertia-Location, sin logout
app/Http/Middleware/EnforceUserSession.php         — 4 bloques: activo, token, días, horario
app/Models/Sale.php                                — accounting_date en $fillable
app/Models/BovedaEntry.php                         — pair_id en $fillable
app/Models/Product.php                             — stock_product_id en $fillable
app/Services/DollarRateService.php                 — getTodayRate, fallback, MAX_CHANGE_PCT
app/Services/CurrencyFetcherService.php            — dolarapi.com → brecha-cambiaria.com
app/Console/Commands/FetchDollarRate.php            — dollar:fetch command
app/Console/Commands/BankingAlertCommand.php        — cash:banking-alert --minutes=
routes/console.php                                 — scheduler dollar:fetch cada 15 min
routes/web.php                                     — POST /set-branch con middleware rol
resources/js/Pages/Dashboard.vue                   — Widget Rendimiento por Canal, Centro de Control
resources/js/Pages/Reports/Empresarial.vue         — botones período rápido
resources/js/Pages/Boveda/Index.vue                — entrada dual, modal prorrateo Canal 1/2
resources/js/Pages/POS/Index.vue                   — botón bloqueado sin client_name en créditos
resources/js/Pages/Settings/Ticket.vue             — configuración ticket impreso
resources/js/Layouts/AppLayout.vue                 — canEditRate, selector sucursal, banking_alert banner
database/seeders/CatalogSeederChaguaramas.php      — catálogo real con pool Carne del Canal
```

---

*SYNTIdev — synti.dev | MASTER DOC SYNTImeat v1 | 28 Mayo 2026 | Confidencial*
*Basado en SESSION_HANDOFF_26MAY2026_v2, v3 FINAL + SYSTEM_MAP 2026-05-24 + stress_test.php 146/146*
