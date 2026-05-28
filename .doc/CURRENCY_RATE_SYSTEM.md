# Sistema de Tasas de Cambio — SYNTIweb

**Versión:** 1.0  
**Fecha:** 2026-05-27  
**Autor:** Generado automáticamente desde el código fuente

---

## Índice

1. [Visión general](#1-visión-general)
2. [Fuentes de datos](#2-fuentes-de-datos)
3. [Modelo de datos](#3-modelo-de-datos)
4. [Servicios](#4-servicios)
5. [Comando artisan](#5-comando-artisan-dollarupdate)
6. [Scheduler (planificador)](#6-scheduler)
7. [Propagación a tenants](#7-propagación-a-tenants)
8. [Modos de visualización](#8-modos-de-visualización)
9. [Override manual y tasa paralela](#9-override-manual-y-tasa-paralela)
10. [Panel de administración](#10-panel-de-administración)
11. [Flujo completo de actualización](#11-flujo-completo-de-actualización)
12. [Variables de entorno y configuración](#12-variables-de-entorno-y-configuración)

---

## 1. Visión general

SYNTIweb opera en Venezuela y soporta precios en tres monedas:

| Símbolo | Moneda            | Fuente      |
|---------|-------------------|-------------|
| REF     | Dólar BCV Oficial | ve.dolarapi.com / brecha-cambiaria.com |
| Bs      | Bolívares         | Calculado: `precio_usd × tasa_usd`     |
| €       | Euro BCV Oficial  | ve.dolarapi.com / brecha-cambiaria.com |

> **Nunca** se usa el símbolo `$`. El símbolo oficial en la UI es **REF**.

Las tasas se obtienen automáticamente cada 15 minutos, se almacenan en base de datos, se cachean en memoria y se propagan al JSON `settings` de cada tenant activo con `auto_update = true`.

---

## 2. Fuentes de datos

### 2.1 USD (BCV Oficial)

Intentos en orden hasta obtener una tasa válida (`> 10` y `< 10000`):

| Prioridad | URL | Campo |
|-----------|-----|-------|
| 1 | `https://ve.dolarapi.com/v1/dolares/oficial` | `promedio` |
| 2 | `https://brecha-cambiaria.com/api/prices` | `bcv_usd` |

### 2.2 EUR (BCV Oficial)

| Prioridad | URL | Campo |
|-----------|-----|-------|
| 1 | `https://ve.dolarapi.com/v1/dolares` | Objeto donde `fuente === 'euro'` → `promedio` |
| 2 | `https://brecha-cambiaria.com/api/prices` | `bcv_eur` |

### 2.3 Tasa paralela (opcional / dashboard admin)

| URL | Campo |
|-----|-------|
| `https://ve.dolarapi.com/v1/dolares` | Objeto donde `fuente === 'paralelo'` → `promedio` |

La tasa paralela es informativa: se expone solo vía `ParallelRateController` para uso en la UI del panel. No se propaga a tenants.

### 2.4 Timeouts HTTP

| Parámetro | Valor |
|-----------|-------|
| Timeout general | 8 segundos |
| Timeout de conexión | 5 segundos |

### 2.5 Validación de tasa

Una tasa recibida es **rechazada** si:

- `rate <= 10` o `rate >= 10000` → tasa fuera de rango
- Cambio respecto a tasa anterior `> 20%` → marca como `suspicious_rate` y rechaza
- Cambio entre `10%` y `20%` → solo emite advertencia en log, acepta la tasa

---

## 3. Modelo de datos

**Archivo:** `app/Models/DollarRate.php`  
**Tabla:** `dollar_rates`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | PK | — |
| `rate` | decimal(12,4) | Valor de la tasa |
| `source` | string | Nombre de la fuente (`ve.dolarapi.com`, etc.) |
| `currency_type` | string | `USD` o `EUR` |
| `effective_from` | datetime | Momento en que esta tasa entró en vigor |
| `effective_until` | datetime (nullable) | Momento en que fue reemplazada |
| `is_active` | boolean | `true` solo para la tasa vigente por tipo |
| `created_at` | datetime | Creado automáticamente |

> `UPDATED_AT = null` — la tabla NO tiene columna `updated_at`.

**Scopes disponibles:**
- `DollarRate::scopeUsd()` — filtra `currency_type = 'USD'`
- `DollarRate::scopeEur()` — filtra `currency_type = 'EUR'`

**Invariante:** Solo puede haber un registro con `is_active = true` por `currency_type` en cualquier momento. Cuando se guarda una nueva tasa, todas las anteriores del mismo tipo se marcan `is_active = false` y se les asigna `effective_until = now()`.

---

## 4. Servicios

### 4.1 `CurrencyFetcherService`

**Archivo:** `app/Services/CurrencyFetcherService.php`  
**Responsabilidad:** Consumir las APIs externas y retornar la tasa cruda.

Métodos principales:

- `fetchUsdRate(): ?float` — Intenta fuente 1, si falla intenta fuente 2. Retorna `null` si ambas fallan.
- `fetchEurRate(): ?float` — Misma lógica para EUR.
- Aplica la validación de rango (`> 10 && < 10000`) antes de retornar.

### 4.2 `DollarRateService`

**Archivo:** `app/Services/DollarRateService.php`  
**Responsabilidad:** Orquestar todo el ciclo de vida de las tasas.

#### Constantes

| Constante | Valor | Uso |
|-----------|-------|-----|
| `MAX_RATE_CHANGE_PERCENT` | `10.0` | Umbral de advertencia |
| — | `20.0` | Umbral de rechazo (hard) |

#### Cache

| Cache key | TTL | Descripción |
|-----------|-----|-------------|
| `dollar_rate_current` | 3600 s | Tasa USD vigente |
| `euro_rate_current` | 3600 s | Tasa EUR vigente |

#### Métodos de lectura

| Método | Descripción |
|--------|-------------|
| `getCurrentRate(): float` | Retorna la tasa USD desde cache; si no existe, busca en DB; si no hay registro activo, retorna el fallback |
| `getCurrentEuroRate(): float` | Igual para EUR |
| `isStale(int $hoursThreshold = 4): bool` | `true` si el último registro USD activo es más antiguo que `$hoursThreshold` horas |
| `getLastUpdate(): ?Carbon` | `effective_from` del último registro USD activo |
| `getHistoricalRates(int $days = 30): Collection` | Historial de los últimos N días, ordenado por `effective_from DESC` |

#### Métodos de escritura / actualización

| Método | Descripción |
|--------|-------------|
| `fetchAndStore(): bool` | Llama a `CurrencyFetcherService::fetchUsdRate()`, guarda en DB si válida, limpia cache |
| `fetchAndStoreEuro(): bool` | Igual para EUR |
| `fetchAndPropagate(): void` | `fetchAndStore()` + `propagateRateToTenants()` |
| `fetchAndPropagateAll(): void` | Actualiza USD + EUR y propaga ambas |
| `refreshCache(): void` | Fuerza recarga desde DB al cache |

#### Secuencia de guardado (por tipo de moneda)

1. Obtener nueva tasa via `CurrencyFetcherService`
2. Validar rango (`> 10 && < 10000`)
3. Comparar con tasa activa anterior:
   - Cambio `> 20%` → rechazar, loguear `suspicious_rate`, no guardar
   - Cambio `> 10%` → loguear warning, guardar igual
4. Marcar registros anteriores: `is_active = false`, `effective_until = now()`
5. Insertar nuevo registro: `is_active = true`, `effective_from = now()`
6. Limpiar cache key correspondiente
7. Propagar a tenants activos

---

## 5. Comando artisan `dollar:update`

**Archivo:** `app/Console/Commands/UpdateDollarRate.php`  
**Firma:** `php artisan dollar:update`

### Flujo de ejecución

```
1. fetchAndPropagate()         → actualiza USD + propaga a tenants
2. fetchAndStoreEuro()         → guarda nueva tasa EUR en DB
3. propagateEuroRateToTenants() → propaga EUR a tenants activos
4. isStale(4)?
   └─ sí → Log::error() + envía email de alerta
```

### Email de alerta por staleness

- **Disparador:** `isStale(4)` = la tasa USD no ha cambiado en las últimas 4 horas
- **Destinatario:** `config('mail.from.address')`
- **Asunto:** `[ALERTA] Tasa BCV sin actualizar — SYNTIweb`
- **Contenido:** Notifica que la tasa lleva más de 4 horas sin actualizar

---

## 6. Scheduler

**Archivo:** `routes/console.php`

| Comando | Frecuencia | Flags |
|---------|-----------|-------|
| `dollar:update` | Cada 15 minutos | `withoutOverlapping()`, `runInBackground()` |
| `tenants:check-expiry` | Diario a las 02:00 | — |
| `alerts:check` | Cada hora | — |
| `reports:send --period=weekly` | Lunes a las 08:00 | — |
| `reports:send --period=monthly` | Día 1 de cada mes a las 08:00 | — |
| `domains:verify-dns` | Diario a las 06:00 | — |
| `domains:process-expirations` | Diario a las 07:00 | — |

> **Nota:** `dollar:update` corre cada **15 minutos**, no cada hora como indica CLAUDE.md.

---

## 7. Propagación a tenants

### 7.1 Condiciones para propagar

Un tenant recibe la tasa actualizada solo si cumple **ambas condiciones**:

1. `tenants.status = 'active'`
2. `settings.engine_settings.currency.auto_update = true` (default: `true`)

### 7.2 Campos actualizados en `settings` (JSON column)

**Propagación USD:**

| Ruta JSON | Valor |
|-----------|-------|
| `settings.engine_settings.currency.exchange_rate` | Nueva tasa USD |
| `settings.engine_settings.currency.source` | Nombre de la fuente API |
| `settings.engine_settings.currency.last_update` | `now()` en ISO 8601 |

**Propagación EUR:**

| Ruta JSON | Valor |
|-----------|-------|
| `settings.engine_settings.currency.euro_rate` | Nueva tasa EUR |
| `settings.engine_settings.currency.euro_last_update` | `now()` en ISO 8601 |

### 7.3 Override manual por tenant

Si `CompanySetting::first()->manual_rate_enabled = true`, se usan los campos:
- `manual_usd_rate` para USD
- `manual_eur_rate` para EUR

Cuando el override manual está activo, la API externa NO se consulta para esos tenants.

---

## 8. Modos de visualización

**Controlador:** `TenantRendererController` (inyecta `DollarRateService`)  
**Ruta del setting:** `settings.engine_settings.currency.display.saved_display_mode`  
**Default:** `reference_only`

| Modo | Descripción |
|------|-------------|
| `reference_only` | Muestra solo precio en REF (USD) |
| `bolivares_only` | Muestra solo precio en Bs (calculado) |
| `both_toggle` | Toggle UI: el usuario elige ver REF o Bs |
| `euro_toggle` | Muestra precio en euros, con toggle |
| `hidden` | Oculta todos los precios |

### 8.1 Cálculo de precios en bolívares

```php
$price_bs_calculated = round($price_usd * $dollarRate, 2);
```

El campo `exchange_rate` se adjunta al objeto producto en cada render (no se guarda en DB).

### 8.2 Variables de vista inyectadas

Desde `TenantRendererController::render()`:

| Variable | Tipo | Contenido |
|----------|------|-----------|
| `$dollarRate` | float | Tasa USD vigente |
| `$euroRate` | float | Tasa EUR vigente |
| `$currencySettings` | array | `settings.engine_settings.currency` completo |
| `$displayMode` | string | Modo activo |
| `$savedDisplayMode` | string | Mismo que displayMode (alias) |
| `$showReference` | bool | Mostrar precio REF |
| `$showBolivares` | bool | Mostrar precio Bs |
| `$showEuro` | bool | Mostrar precio EUR |
| `$hidePrice` | bool | Ocultar todos los precios |

---

## 9. Override manual y tasa paralela

### 9.1 Override manual (DollarRateService)

Configurado en `CompanySetting` (primera y única fila):

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `manual_rate_enabled` | boolean | Activa el override |
| `manual_usd_rate` | decimal | Tasa USD manual |
| `manual_eur_rate` | decimal | Tasa EUR manual |

Cuando `manual_rate_enabled = true`, `DollarRateService::getCurrentRate()` y `getCurrentEuroRate()` retornan los valores manuales en lugar de consultar la DB/cache.

### 9.2 Tasa paralela (`ParallelRateController`)

**Archivo:** `app/Http/Controllers/ParallelRateController.php`  
**Ruta:** expuesta como endpoint JSON (ver `routes/web.php`)

```
GET /api/parallel-rate   →   { "rate": 123.45, "source": "api" | "manual" }
```

| Escenario | Respuesta |
|-----------|-----------|
| `CompanySetting::parallel_rate_override` está definido | `{ rate: valor_manual, source: "manual" }` |
| Campo vacío → consulta API | `https://ve.dolarapi.com/v1/dolares` → `fuente === 'paralelo'` → `promedio` |

**Cache:** `parallel_rate` → TTL 1800 s (30 minutos)  
**Timeout HTTP:** 5 segundos

> Esta tasa es **solo informativa**. No se almacena en `dollar_rates` ni se propaga a tenants.

---

## 10. Panel de administración

### 10.1 Widget de tasas

**Archivo:** `app/Filament/Widgets/CurrencyRatesWidget.php`  
**Tipo:** `StatsOverviewWidget` (Filament v5)  
**Polling:** Deshabilitado (`pollingInterval = null`)  
**Columnas:** 3 (span completo)

Muestra tres stats:

| Stat | Fuente | Color |
|------|--------|-------|
| `USD · BCV Oficial` — valor en Bs | `DollarRateService::getCurrentRate()` | primary |
| `EUR · BCV Oficial` — valor en Bs | `DollarRateService::getCurrentEuroRate()` | success |
| `Actualizado · pydolarve.org` — tiempo relativo | `DollarRate` donde `is_active = true` → `effective_from` → `diffForHumans()` | gray |

> Si algún servicio falla, el stat muestra `N/D` (no se lanza excepción al usuario).

---

## 11. Flujo completo de actualización

```
Scheduler (cada 15 min)
    └─ php artisan dollar:update
           │
           ├─ CurrencyFetcherService::fetchUsdRate()
           │       ├─ ve.dolarapi.com/v1/dolares/oficial  →  promedio
           │       └─ (fallback) brecha-cambiaria.com/api/prices  →  bcv_usd
           │
           ├─ Validar rango (10 < rate < 10000)
           ├─ Validar cambio vs tasa anterior (>20% = rechazar)
           │
           ├─ DollarRate anterior: is_active=false, effective_until=now()
           ├─ DollarRate nuevo:    is_active=true,  effective_from=now()
           ├─ Cache 'dollar_rate_current' invalidado
           │
           ├─ propagateRateToTenants()
           │       └─ Tenants activos con auto_update=true
           │               → settings.engine_settings.currency.exchange_rate = nueva_tasa
           │               → settings.engine_settings.currency.source = fuente
           │               → settings.engine_settings.currency.last_update = now()
           │
           ├─ CurrencyFetcherService::fetchEurRate()
           │       ├─ ve.dolarapi.com/v1/dolares  →  fuente='euro'  →  promedio
           │       └─ (fallback) brecha-cambiaria.com/api/prices  →  bcv_eur
           │
           ├─ DollarRate EUR anterior: is_active=false, effective_until=now()
           ├─ DollarRate EUR nuevo:    is_active=true,  effective_from=now()
           ├─ Cache 'euro_rate_current' invalidado
           │
           ├─ propagateEuroRateToTenants()
           │       └─ Tenants activos con auto_update=true
           │               → settings.engine_settings.currency.euro_rate = nueva_tasa_eur
           │               → settings.engine_settings.currency.euro_last_update = now()
           │
           └─ isStale(4)?
                   └─ sí → Log::error + Email alerta a mail.from.address


Request de landing page (por tenant)
    └─ TenantRendererController::render()
           ├─ DollarRateService::getCurrentRate()   → cache 'dollar_rate_current'
           ├─ DollarRateService::getCurrentEuroRate() → cache 'euro_rate_current'
           ├─ calculateProductPrices()
           │       └─ price_bs_calculated = round(price_usd × dollarRate, 2)
           └─ Pasar $dollarRate, $euroRate, $displayMode, ... a la vista
```

---

## 12. Variables de entorno y configuración

### `.env`

| Variable | Default | Descripción |
|----------|---------|-------------|
| `DOLLAR_FALLBACK_RATE` | `40.00` | Tasa USD de emergencia si no hay DB ni API |

### `config/currency.php`

| Clave | Default | Descripción |
|-------|---------|-------------|
| `currency.fallback_eur` | `495.00` | Tasa EUR de emergencia |

### `CompanySetting` (base de datos — fila única)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `manual_rate_enabled` | boolean | Activa override manual de tasas |
| `manual_usd_rate` | decimal | Tasa USD manual |
| `manual_eur_rate` | decimal | Tasa EUR manual |
| `parallel_rate_override` | decimal (nullable) | Tasa paralela manual para el endpoint JSON |

---

*Documento generado el 2026-05-27 desde el código fuente de SYNTIweb (synticorex).*
