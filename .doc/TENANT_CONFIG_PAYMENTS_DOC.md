# Módulo de Configuración de Tenant — Pagos, Moneda y PIN

**Versión:** 1.0  
**Fecha:** 2026-05-27  
**Autor:** Generado automáticamente desde el código fuente

---

## Índice

1. [Arquitectura General](#1-arquitectura-general)
2. [Modelo de Datos](#2-modelo-de-datos)
3. [Métodos de Pago Disponibles](#3-métodos-de-pago-disponibles)
4. [Modos de Moneda](#4-modos-de-moneda)
5. [Datos de Cobro por Método](#5-datos-de-cobro-por-método)
6. [Catálogo de Bancos Venezolanos](#6-catálogo-de-bancos-venezolanos)
7. [Sistema PIN](#7-sistema-pin)
8. [Flujo Config → Comanda → WhatsApp](#8-flujo-config--comanda--whatsapp)
9. [Variables Alpine.js en el Dashboard](#9-variables-alpinejs-en-el-dashboard)
10. [Rutas del Módulo](#10-rutas-del-módulo)
11. [Checklist para Replicar en Nuevo Producto](#11-checklist-para-replicar-en-nuevo-producto)

---

## 1. Arquitectura General

```
TENANT (propietario)
    └─ Dashboard (auth + web)
          ├─ Tab Configuración
          │     ├─ Tasas BCV (solo lectura, info)
          │     ├─ Métodos de Pago  →  POST /tenant/{id}/update-payment-methods
          │     ├─ Moneda           →  POST /tenant/{id}/update-currency-config
          │     ├─ PIN de Acceso    →  POST /tenant/{id}/update-pin
          │     └─ Info del Plan
          └─ (datos guardados en dos lugares)
                ├─ tenant_customization.payment_methods (JSON array)
                └─ tenants.settings (JSON → engine_settings.currency)

CLIENTE FINAL (storefront)
    └─ Landing Page
          ├─ Sección Medios de Pago  → landing/sections/payment_methods.blade.php
          └─ Floating Panel (PIN)    → landing/sections/floating-panel.blade.php
                └─ POST /tenant/{id}/verify-pin (throttle: 5/min)

SISTEMA FOOD
    └─ POST /food/{subdomain}/comanda
          └─ ComandaService::generate() → WhatsApp URL con total en REF
```

### Repositorios de configuración

| Dato | Modelo | Campo / Ruta |
|------|--------|-------------|
| Métodos de pago activos | `TenantCustomization` | `payment_methods` (JSON) |
| Datos de cobro (banco, email, etc.) | `TenantCustomization` | `payment_methods.details` (JSON) |
| Divisas aceptadas | `TenantCustomization` | `payment_methods.currency` (JSON) |
| Métodos por sucursal (Plan 3) | `TenantCustomization` | `payment_methods.branches` (JSON) |
| Modo de visualización de moneda | `Tenant.settings` | `engine_settings.currency.display.saved_display_mode` |
| Símbolo de referencia | `Tenant.settings` | `engine_settings.currency.display.symbols.reference` |
| Flags de display | `Tenant.settings` | `engine_settings.currency.display.{show_reference,show_bolivares,show_euro,hide_price,has_toggle}` |
| PIN de acceso | `Tenant` | `edit_pin` (bcrypt hash) |
| Modo legacy moneda | `Tenant` | `currency_display` (`usd|bs|both`) |

---

## 2. Modelo de Datos

### `tenants` (tabla principal)

| Columna | Tipo SQL | Valores posibles | Descripción |
|---------|----------|------------------|-------------|
| `edit_pin` | varchar(255) | hash bcrypt | PIN de 4 dígitos hasheado. Default al crear: `bcrypt('1234')` |
| `currency_display` | varchar(10) | `usd`, `bs`, `both` | Campo legacy. Default: `both`. Superado por `settings.engine_settings.currency.display` |
| `whatsapp_sales` | varchar(20) | `58412XXXXXXX` | Número ventas (se usa en pago móvil) |
| `whatsapp_support` | varchar(20) | `58412XXXXXXX` | Número soporte |
| `whatsapp_active` | varchar(20) | `sales`, `support` | Cuál WhatsApp se usa como activo |
| `settings` | JSON | objeto | Árbol de configuración del motor |
| `is_open` | boolean | `0`, `1` | Controla si se pueden generar comandas |

**Fillable relevante:** `edit_pin`, `currency_display`, `whatsapp_sales`, `whatsapp_support`, `whatsapp_active`, `is_open`, `settings`

> **Nota:** `DashboardController::updatePin()` hace referencia a `$tenant->pin_hash` en lugar de `$tenant->edit_pin`. La columna real en la BD es `edit_pin`. La verificación en storefront (`TenantRendererController::verifyPin()`) usa correctamente `edit_pin`.

### `tenant_customization` (tabla secundaria)

| Columna | Tipo SQL | Cast | Descripción |
|---------|----------|------|-------------|
| `payment_methods` | JSON (nullable) | `array` | Estructura completa de pagos |
| `social_networks` | JSON (nullable) | `array` | Redes sociales del tenant |
| `visual_effects` | JSON (nullable) | `array` | Orden de secciones, configs visuales |
| `content_blocks` | JSON (nullable) | `array` | Textos personalizados por sección. Incluye `legal_links.enabled` |
| `theme_slug` | varchar | — | Tema Preline activo |

**Estructura de `payment_methods`:**

```json
{
  "global": ["pagoMovil", "zelle", "paypal"],
  "currency": ["usd", "eur"],
  "branches": {
    "1": ["pagoMovil", "cash"],
    "2": ["zelle", "paypal"]
  },
  "details": {
    "pagoMovil": {
      "bank": "Banesco",
      "use_business_whatsapp": true,
      "phone": "04121234567",
      "document_type": "J",
      "document_number": "123456789",
      "account_holder": "Mi Empresa, C.A."
    },
    "paypal": {
      "email": "cobros@negocio.com",
      "account_holder": "Juan Pérez"
    },
    "zinli": {
      "email": "zinli@negocio.com",
      "account_holder": "Juan Pérez"
    },
    "zelle": {
      "email_or_phone": "+1 305 123 4567",
      "account_holder": "Juan Pérez"
    },
    "binancepay": {
      "binance_id": "123456789",
      "account_holder": "Juan Pérez"
    }
  }
}
```

**Estructura de `settings.engine_settings.currency`:**

```json
{
  "exchange_rate": 87.45,
  "euro_rate": 95.20,
  "source": "ve.dolarapi.com",
  "last_update": "2026-05-27T10:00:00Z",
  "euro_last_update": "2026-05-27T10:00:00Z",
  "auto_update": true,
  "display": {
    "saved_display_mode": "reference_only",
    "show_reference": true,
    "show_bolivares": false,
    "show_euro": false,
    "hide_price": false,
    "has_toggle": false,
    "symbols": {
      "reference": "REF"
    }
  }
}
```

---

## 3. Métodos de Pago Disponibles

Fuente de verdad: `DashboardController::index()` → variable `$allPayMeta`

### Nacionales

| Key | Label | Icono (Tabler) | Grupo |
|-----|-------|----------------|-------|
| `pagoMovil` | Pago Móvil | `tabler--device-mobile` | Nacional |
| `cash` | Efectivo | `tabler--cash` | Nacional |
| `puntoventa` | Punto de Venta | `tabler--credit-card` | Nacional |
| `biopago` | Biopago | `tabler--fingerprint` | Nacional |
| `cashea` | Cashea | `tabler--wallet` | Nacional |
| `krece` | Krece | `tabler--trending-up` | Nacional |
| `wepa` | Wepa | `tabler--shopping-cart` | Nacional |
| `lysto` | Lysto | `tabler--calendar-dollar` | Nacional |
| `chollo` | Chollo | `tabler--discount-2` | Nacional |
| `wally` | Wally | `tabler--send-2` | Nacional |
| `kontigo` | Kontigo | `tabler--file-invoice` | Nacional |

### Internacionales / Divisas

| Key | Label | Icono (Tabler) | Grupo |
|-----|-------|----------------|-------|
| `zelle` | Zelle | `tabler--bolt` | Divisa |
| `paypal` | PayPal | `tabler--brand-paypal` | Divisa |
| `zinli` | Zinli | `tabler--moneybag` | Divisa |
| `airtm` | AirTM | `tabler--exchange` | Divisa |
| `reserve` | Reserve (RSV) | `tabler--shield-dollar` | Divisa |
| `binancepay` | Binance Pay | `tabler--currency-bitcoin` | Divisa |
| `usdt` | USDT | `tabler--coin` | Divisa |

### Divisas (monedas complementarias)

| Key | Label | Icono |
|-----|-------|-------|
| `usd` | Dólares (USD) | `tabler--currency-dollar` |
| `eur` | Euros (€) | `tabler--currency-euro` |

### Restricciones por plan

| Plan | Comportamiento |
|------|----------------|
| Plan 1 / Básico (`oportunidad`, `food-basico`, `cat-basico`) | Fijo: solo `pagoMovil` + `cash`. No editable. |
| Plan 2 / Crecimiento | Todos los métodos. Solo selección global. |
| Plan 3 / Visión / Anual | Todos los métodos. Selección global + por sucursal. |

---

## 4. Modos de Moneda

Fuente de verdad: `DashboardController::updateCurrencyConfig()`  
Ruta del setting: `settings.engine_settings.currency.display.saved_display_mode`

| Modo | Label en UI | Flags resultantes |
|------|------------|-------------------|
| `reference_only` | Solo Referencia (REF/$) | `show_reference=true`, `show_bolivares=false`, `show_euro=false`, `hide_price=false`, `has_toggle=false` |
| `bolivares_only` | Solo Bolívares (Bs.) | `show_reference=false`, `show_bolivares=true`, `show_euro=false`, `hide_price=false`, `has_toggle=false` |
| `both_toggle` | Ambos con toggle (REF/Bs.) | `show_reference=true`, `show_bolivares=true`, `show_euro=false`, `hide_price=false`, `has_toggle=true` |
| `euro_toggle` | Toggle con Euro (€/Bs.) | `show_reference=true`, `show_bolivares=true`, `show_euro=true`, `hide_price=false`, `has_toggle=true` |
| `hidden` | Ocultar → "Más Info" | `show_reference=false`, `show_bolivares=false`, `show_euro=false`, `hide_price=true`, `has_toggle=false` |

### Símbolo configurable

- Toggle en la UI: **REF** (izquierda) ←→ **$** (derecha)
- Guardado en: `settings.engine_settings.currency.display.symbols.reference`
- Default: `REF`

---

## 5. Datos de Cobro por Método

Solo 5 métodos tienen formulario de datos de cobro. El resto son solo flags de activación.

### Pago Móvil (`pagoMovil`)

| Campo | Input | Max | Validación |
|-------|-------|-----|-----------|
| `bank` | select | 80 | Nombre del banco de la lista oficial |
| `use_business_whatsapp` | checkbox | — | Si `true`, el teléfono se toma del `tenant.getActiveWhatsapp()` |
| `phone` | tel | 11 chars | Regex: `0(412|414|416|422|424|426)[0-9]{7}` |
| `document_type` | select | — | `V`, `E`, `J`, `G`, `P` |
| `document_number` | text | 20 | Libre |
| `account_holder` | text | 120 | Nombre del titular |

**Lógica `use_business_whatsapp`:**  
Si activado: el teléfono en el formulario se deshabilita y se toma `tenant.getActiveWhatsapp()`, se convierte a formato local (0424...) usando:  
```php
$waRaw = preg_replace('/\D/', '', $tenant->getActiveWhatsapp() ?? '');
$waLocal = $waRaw ? '0' . preg_replace('/^58/', '', $waRaw) : '';
```

### PayPal (`paypal`)

| Campo | Input | Max |
|-------|-------|-----|
| `email` | email | 120 |
| `account_holder` | text | 120 |

### Zinli (`zinli`)

| Campo | Input | Max |
|-------|-------|-----|
| `email` | email | 120 |
| `account_holder` | text | 120 |

### Zelle (`zelle`)

| Campo | Input | Max |
|-------|-------|-----|
| `email_or_phone` | text | 120 | Correo o teléfono USA |
| `account_holder` | text | 120 |

### Binance Pay (`binancepay`)

| Campo | Input | Max |
|-------|-------|-----|
| `binance_id` | text | 120 | ID o correo Binance |
| `account_holder` | text | 120 |

---

## 6. Catálogo de Bancos Venezolanos

**Fuente:** Definido directamente en `config-section.blade.php` como array PHP `$bankOptions`.  
No proviene de BD ni de archivo de configuración externo.

| Código | Nombre del Banco |
|--------|-----------------|
| 0102 | Banco de Venezuela |
| 0104 | Venezolano de Credito |
| 0105 | Banco Mercantil |
| 0108 | Banco Provincial |
| 0114 | Bancaribe |
| 0115 | Banco Exterior |
| 0128 | Banco Caroni |
| 0134 | Banesco |
| 0137 | Banco Sofitasa |
| 0138 | Banco Plaza |
| 0151 | BFC Banco Fondo Comun |
| 0156 | 100% Banco |
| 0157 | DelSur |
| 0163 | Banco del Tesoro |
| 0168 | Bancrecer |
| 0171 | Banco Activo |
| 0172 | Bancamiga |
| 0174 | Banplus |
| 0177 | Banfanb |
| 0191 | BNC |

**Total:** 20 bancos. El valor guardado en `payment_methods.details.pagoMovil.bank` es el **nombre** del banco (no el código).

---

## 7. Sistema PIN

### Almacenamiento

| Campo | Tabla | Tipo | Algoritmo |
|-------|-------|------|-----------|
| `edit_pin` | `tenants` | varchar(255) | bcrypt (Laravel `Hash::make()`) |

**PIN por defecto al crear tenant:** `1234` (hasheado con `bcrypt('1234')`)  
**Recuperación olvidado:** No hay proceso automático. El admin lo restablece desde Filament (`TenantResource`).

### Verificación en storefront (`TenantRendererController::verifyPin()`)

```
POST /tenant/{tenantId}/verify-pin
Middleware: throttle:5,1  (máx 5 intentos por minuto por IP)

Flujo:
1. Buscar tenant por ID donde status = 'active'
2. Hash::check($request->pin, $tenant->edit_pin)
3. Si correcto → { success: true }
4. Si incorrecto → { success: false }
```

### Cambio de PIN desde el dashboard (`DashboardController::updatePin()`)

```
POST /tenant/{tenantId}/update-pin
Middleware: auth + web

Validación:
- current_pin: required, string, size:4, regex:/^[0-9]{4}$/
- new_pin: required, string, size:4, regex:/^[0-9]{4}$/
- new_pin_confirmation: required, same:new_pin

Flujo:
1. Hash::check(current_pin, $tenant->pin_hash)  ← (inconsistencia: column real es edit_pin)
2. Si PIN actual incorrecto → 422
3. $tenant->pin_hash = Hash::make(new_pin)      ← (inconsistencia: column real es edit_pin)
4. $tenant->save()
```

### UI en el storefront (`floating-panel.blade.php`)

- El panel se abre con `Alt+S` (desktop) o manteniendo presionado el logo 3 segundos (móvil)
- Modal de PIN: 4 inputs individuales de 1 dígito (`inputmode="numeric"`)
- Botón "Entrar" llama a `verifyPin()` (JS)
- Si correcto: se muestra `#synti-panel-content` (oculto por defecto)
- Error incorrecto: `#synti-pin-error` visible

---

## 8. Flujo Config → Comanda → WhatsApp

### Paso a paso completo

```
TENANT configura pagos
    └─ Dashboard → Tab Config → Métodos de Pago
          ├─ Selecciona métodos (global)
          ├─ Selecciona divisas aceptadas
          ├─ Llena datos de cobro (Pago Móvil, Zelle, etc.)
          └─ POST /tenant/{id}/update-payment-methods
                └─ DashboardController::updatePaymentMethods()
                      └─ Guarda en tenant_customization.payment_methods

CLIENTE hace pedido (blueprint food)
    └─ POST /food/{subdomain}/comanda
          └─ ComandaController::store()
                ├─ Valida: customer_name, modalidad, items[]
                ├─ Verifica BusinessHoursService::isOpen($tenant)
                ├─ ComandaService::generate($tenant, ...)
                │     ├─ ID único: SF-XXXXXX (6 chars alfanuméricos)
                │     ├─ Calcula total: Σ(item.qty × item.precio)
                │     └─ Guarda JSON en storage/app/tenants/{id}/comandas/{year}/{month}/SF-XXXX.json
                │           (solo food-vision persiste; otros planes borran el archivo)
                └─ Construye mensaje WhatsApp inline:
                      ┌──────────────────────────────────────────┐
                      │ 🍽 Comanda SF-ABC123                     │
                      │                                          │
                      │ • Pollo x2 — REF 14,00                   │
                      │ • Refresco x1 — REF 2,50                 │
                      │                                          │
                      │ Total: REF 16,50                         │
                      │                                          │
                      │ Nombre: Carlos López                     │
                      │ Modalidad: Delivery                      │
                      └──────────────────────────────────────────┘
                └─ URL: https://wa.me/{número}?text={encoded_message}
                      número = tenant.getActiveWhatsapp() → preg_replace('/\D/', '', ...)
```

> **Nota:** Los datos de cobro (banco, email, etc.) **no** se incluyen en el mensaje de la comanda. Son informativos para que el cliente los consulte en la sección Medios de Pago del storefront.

### WhatsappMessageBuilder (SyntiCat / Órdenes)

Para comandas de SyntiCat (`OrderService`), usa `WhatsappMessageBuilder::build()`:

```
🛒 Orden OC-XXXXXX — {nombre_negocio}
────────────────────────────────
🛍 {producto} ({variante}) x{qty} — REF {subtotal}
────────────────────────────────
💰 Subtotal: REF {total}

👤 {cliente.name}
📱 {cliente.phone}
📍 {cliente.location}  (si tiene)
```

URL final: `WhatsappMessageBuilder::url($message, $waNumber)` → limpia el número con `preg_replace('/\D/', '', $waNumber)`.

---

## 9. Variables Alpine.js en el Dashboard

El tab Configuración no usa `x-data` global. Las interacciones son funciones JavaScript simples. Alpine se usa puntualmente:

### Métodos por sucursal (Plan 3)

```html
<div x-data="{ branchPay: false }">
    <button @click="branchPay = !branchPay">
        Métodos por Sucursal
        <span :class="branchPay && 'rotate-180'">▼</span>
    </button>
    <div x-show="branchPay" x-collapse x-cloak>
        ...
    </div>
</div>
```

### Funciones JavaScript del tab Config

Todas las acciones de guardar son funciones JS (no Alpine) que hacen `fetch()` a los endpoints:

| Función JS | Endpoint | Controlador |
|-----------|---------|------------|
| `savePaymentMethods()` | `POST /tenant/{id}/update-payment-methods` | `DashboardController::updatePaymentMethods()` |
| `saveCurrencyConfig()` | `POST /tenant/{id}/update-currency-config` | `DashboardController::updateCurrencyConfig()` |
| `updatePin()` | `POST /tenant/{id}/update-pin` | `DashboardController::updatePin()` |
| `updateDollarRate()` | (interno) | Refresca display de tasas |
| `togglePayMethod(key)` | — | Actualiza UI checkbox, llama a `savePaymentMethods()` |
| `toggleCurrency(key)` | — | Igual |
| `toggleBranchPayMethod(branchId, key)` | — | Igual |
| `togglePaymentDetailPhone()` | — | Habilita/deshabilita input de teléfono |
| `saveLegalLinksConfig(el)` | vía `savePaymentMethods()` | Guarda `content_blocks.legal_links.enabled` |

---

## 10. Rutas del Módulo

```php
// ── Storefront PIN (sin auth, con rate limit) ─────────────────────────────
Route::post('/tenant/{tenantId}/verify-pin', [TenantRendererController::class, 'verifyPin'])
    ->middleware('throttle:5,1');

// ── Dashboard (auth requerida) ────────────────────────────────────────────
// Métodos de Pago
Route::post('/tenant/{tenantId}/update-payment-methods',  [DashboardController::class, 'updatePaymentMethods']);

// Moneda
Route::post('/tenant/{tenantId}/update-currency-config',  [DashboardController::class, 'updateCurrencyConfig']);

// PIN
Route::post('/tenant/{tenantId}/update-pin',              [DashboardController::class, 'updatePin']);

// Tasa paralela (endpoint JSON informativo)
// Route: ver routes/web.php → ParallelRateController
```

### Middleware del bloque auth

Todas las rutas de dashboard están dentro de un grupo con:
- `middleware('auth')`
- `middleware('web')`

---

## 11. Checklist para Replicar en Nuevo Producto

Para implementar el módulo completo de pagos, moneda y PIN en un nuevo blueprint:

### Base de datos
- [ ] Columna `edit_pin` (varchar 255) en la tabla de tenants — default: `bcrypt('1234')`
- [ ] Columna `currency_display` (varchar 10) en tenants — default: `'both'`
- [ ] Campo `payment_methods` (JSON cast) en `tenant_customization`
- [ ] Campo `settings` (JSON cast) en tenants con ruta `engine_settings.currency.display.*`

### Modelos
- [ ] `Tenant::getActiveWhatsapp()` implementado
- [ ] `TenantCustomization::$fillable` incluye `payment_methods`
- [ ] Cast `'payment_methods' => 'array'` en `TenantCustomization`

### Controladores
- [ ] `DashboardController` inyecta `DollarRateService` en constructor
- [ ] `DashboardController::index()` incluye `$allPayMeta` y `$allCurrencyMeta` en compact
- [ ] `DashboardController::updatePaymentMethods()` valida todos los campos de `details.*`
- [ ] `DashboardController::updateCurrencyConfig()` mapea `display_mode` a flags booleanos
- [ ] `DashboardController::updatePin()` con validación de PIN actual antes de cambiar
- [ ] `TenantRendererController::verifyPin()` con throttle 5/min

### Rutas
- [ ] `POST /tenant/{id}/verify-pin` con `throttle:5,1`
- [ ] `POST /tenant/{id}/update-payment-methods` (auth)
- [ ] `POST /tenant/{id}/update-currency-config` (auth)
- [ ] `POST /tenant/{id}/update-pin` (auth)

### Vistas — Dashboard
- [ ] Incluir `$allPayMeta`, `$allCurrencyMeta`, `$dollarRate`, `$euroRate` desde el controller
- [ ] Leer `$payMethods = $customization->payment_methods ?? []`
- [ ] Leer `$savedMode` desde `$tenant->settings['engine_settings']['currency']['display']['saved_display_mode']`
- [ ] `$bankOptions` definido en la vista (array de 20 bancos con código → nombre)
- [ ] `$documentTypeOptions = ['V', 'E', 'J', 'G', 'P']`
- [ ] UI por plan: Plan 1 → fixed (pagoMovil + cash), Plan 2+ → checkboxes

### Vistas — Storefront
- [ ] `landing/sections/payment_methods.blade.php` lee `$customization->payment_methods`
- [ ] Plan 1 hardcodea `['pagoMovil', 'cash']` en la sección
- [ ] `landing/sections/floating-panel.blade.php` con modal de 4 inputs PIN

### Onboarding
- [ ] Al crear tenant: `'edit_pin' => bcrypt('1234')` como valor default

### Catálogo de métodos (sincronizar en ambos lados)
- [ ] `$allPayMeta` en `DashboardController::index()` debe coincidir exactamente con el catálogo en `payment_methods.blade.php`
- [ ] Las keys del catálogo son el identificador canónico (`pagoMovil`, `cash`, etc.)

---

*Documento generado el 2026-05-27 desde el código fuente de SYNTIweb (synticorex).*
