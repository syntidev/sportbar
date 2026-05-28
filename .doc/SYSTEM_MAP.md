# SYSTEM MAP — SYNTImeat
Actualizado: 2026-05-24
Versión anterior: 2026-05-22
Cambios desde v. anterior marcados con ▲

---

## PRODUCCIÓN

| Campo | Valor |
|-------|-------|
| URL | https://meat.synti.cloud |
| VPS | 187.124.241.213 (Ubuntu 24.04 — Hostinger KVM1) |
| DB | syntimeat_db / syntimeat / SyntiMeat2026! |
| Branch git | main |
| Stress test | 18 fases (ver §10) |

---

## 1. Controllers

### BovedaController
| Línea | Método | Verb | Ruta |
|-------|--------|------|------|
| 22 | `index()` | GET | /boveda |
| 86 | `store()` | POST | /boveda |
| 188 | `surte()` | PATCH | /boveda/{entry}/surtir |
| 306 | `close()` | PATCH | /boveda/{entry}/cerrar |
| 334 | `registerMerma()` | PATCH | /boveda/{entry}/merma |
| 379 | `storeProduct()` | POST | /boveda/productos |
| 416 | `updateProduct()` | PUT | /boveda/productos/{product} |
| 455 | `plantillaDespiece()` | GET | /boveda/{entry}/plantilla |
| 506 | `destroyProduct()` | DELETE | /boveda/productos/{product} |

**Request validated fields:**
- `store()`: product_type, description, kg_entrada, costo_usd, supplier, entered_at, ▲ kg_par (nullable, numeric, min:0.001)
- `surte()`: peso_real
- `registerMerma()`: peso_actual
- `storeProduct()`: name, unit, requires_despiece, vitrina_product_id
- `updateProduct()`: name, unit, requires_despiece, vitrina_product_id

▲ **Canal 1 / Canal 2 (pair_id):** Cuando product_type = 'RES - Medio Canal' y se envía kg_par, `store()` crea DOS BovedaEntries con `pair_id` cruzado (cada una apunta al ID de la otra). La segunda entrada hereda `costo_usd` prorrateado por peso.

**catMap en plantillaDespiece():**
```php
$catMap = [
    'RES - Medio Canal'        => 'Res',
    'CERDO - Canal'            => 'Cerdo',
    'POLLO - Entero Congelado' => 'Pollo',
];
$resOrder = ['Carne del Canal', 'Costilla', 'Hueso Redondo', 'Hueso Rojo'];
```
Nota: plantillaDespiece() NO tiene filtro `whereIn($resOrder)` — muestra todos los productos vitrina Res en el PDF.

**Inertia::render props (`index()`):**
- activas, historial, bovedaProducts, productosVitrina, kpis{entradasActivas, kgDisponible, costoActivo, surtidoHoy}

---

### FabricaController
| Método | Verb | Ruta |
|--------|------|------|
| `index()` | GET | /fabrica |
| `store()` | POST | /fabrica |
| `storeDespiece()` | POST | /fabrica/despiece |

**Request validated fields:**
- `store()`: output_product_id, output_kg, output_units, inputs[].product_id, inputs[].quantity_kg, inputs[].cost_usd, notes, produced_at
- `storeDespiece()`: boveda_entry_id, cortes[].product_id (Rule::exists scoped a business_id), cortes[].kg, notes

▲ **catMap actualizado:**
```php
$catMap = [
    'RES - Medio Canal'        => 'Res',
    'CERDO - Canal'            => 'Cerdo',
    'POLLO - Entero Congelado' => 'Pollo',
];
```

▲ **resOrder (4 cortes Res — filtro UI):**
```php
$resOrder = ['Carne del Canal', 'Costilla', 'Hueso Redondo', 'Hueso Rojo'];
// Filtro: ->when($catName === 'Res', fn($q) => $q->whereIn('name', $resOrder))
```
Premium, Primera, Segunda excluidos del UI de despiece. Solo aparecen 4 cortes Res en Fábrica.

**Inertia::render props (`index()`):**
- fabricables, ingredientes, stockMap, historial, despiecePendiente, despieceHistorial

---

### SaleController
| Método | Verb | Ruta |
|--------|------|------|
| `index()` | GET | /pos |
| `store()` | POST | /pos/ventas |
| `pay()` | PATCH | /pos/ventas/{sale}/pagar |
| `cancel()` | PATCH | /pos/ventas/{sale}/cancelar |
| `void()` | PATCH | /ventas/{sale}/anular |
| `historial()` | GET | /ventas |

▲ **Patrón pool stock_product_id en pay() y cancel():**
```php
$sale->load('items.product');
foreach ($sale->items as $item) {
    if ($item->input_type !== 'weight') continue;
    $stockProductId = $item->product?->stock_product_id ?? $item->product_id;
    InventoryEntry::create(['product_id' => $stockProductId, ...]);
}
```
Premium, Primera y Segunda descuentan inventario de 'Carne del Canal' (su stock_product_id), no de sí mismos.

**Request validated fields:**
- `store()`: items[].product_id, items[].input_type, items[].amount_bs, items[].quantity_value, origin, channel, status, client_name, client_phone, client_id
- `cancel()`: cancellation_reason (min:5)
- `void()`: motivo (min:5)

**Inertia::render props (`index()`):**
- products, categories, cashRegister, todayRate, paymentMethods, ticketPrefix, stockMap, posShowKg, businessInfo, ticketPrefs

---

### CashRegisterController
| Método | Verb | Ruta |
|--------|------|------|
| `index()` | GET | /caja |
| `open()` | POST | /caja/abrir |
| `close()` | POST | /caja/{register}/cerrar |
| `movement()` | POST | /caja/{register}/movimiento |
| `dayClose()` | GET | /caja/cierre |
| `confirmClose()` | POST | /caja/cierre/{register} |

**Request validated fields:**
- `open()`: opening_amount_bs
- `close()`: counted_cash_bs, notes
- `movement()`: type (in/out/corte), amount_bs, concept
- `confirmClose()`: counted_cash_bs, notes

**Inertia::render props (`index()`):**
- cashRegister, allOpenRegisters, history, kpis{expected_bs, sales_total_bs, movements_count, rate}, todayRate, isAdmin

---

### CatalogController
| Método | Verb | Ruta |
|--------|------|------|
| `index()` | GET | /catalogo |
| `store()` | POST | /catalogo/productos |
| `update()` | PUT | /catalogo/productos/{product} |
| `destroy()` | DELETE | /catalogo/productos/{product} |
| `toggleFavorite()` | PATCH | /catalogo/productos/{product}/favorito |
| `downloadProductTemplate()` | GET | /catalogo/plantilla-productos |
| ▲ `importProducts()` | POST | /catalogo/importar |
| `storeCategory()` | POST | /catalogo/categorias |
| `updateCategory()` | PUT | /catalogo/categorias/{category} |
| `destroyCategory()` | DELETE | /catalogo/categorias/{category} |
| `storeSubcategory()` | POST | /catalogo/subcategorias |
| `updateSubcategory()` | PUT | /catalogo/subcategorias/{subcategory} |
| `destroySubcategory()` | DELETE | /catalogo/subcategorias/{subcategory} |

**Request validated fields (store/update producto):**
- name, sku, category_id, subcategory_id, sale_mode, price_per_kg_usd, price_per_unit_usd, location, active, fabricable, image (file)

▲ **importProducts():** Importa productos desde CSV/Excel. Devuelve JSON `{imported, updated, total, errors[]}`. Hace upsert por nombre dentro del business.

**Inertia::render props (`index()`):**
- categories (con subcategorías), products

---

### InventoryController
| Método | Verb | Ruta |
|--------|------|------|
| `index()` | GET | /inventario |
| `store()` | POST | /inventario |

**Request validated fields (`store()`):**
- product_id, quantity_kg, waste_kg, cost_per_kg_usd, supplier, notes, location, entered_at

**Inertia::render props (`index()`):**
- products, categories, todayEntries, stockMap, lastEntryMap, kpis

---

### DashboardController
| Método | Verb | Ruta |
|--------|------|------|
| `index()` | GET | /dashboard |
| `data()` | GET | /dashboard/data (JSON) |

▲ **Filtro branch_id por rol:** data() filtra ventas por branch_id según rol del usuario. Owner/super_admin ven todas las sucursales.

**Inertia::render props (`index()`):**
- ventas_hoy, top_productos, stock_critico, ultimas_ventas, caja_activa, tasa_hoy, pedidos_pendientes, categorias_hoy, utilidad_boveda

---

### OrderController
| Método | Verb | Ruta |
|--------|------|------|
| `index()` | GET | /pedidos |
| `store()` | POST | /pedidos |
| `collect()` | PATCH | /pedidos/{order}/cobrar |
| `dispatch()` | PATCH | /pedidos/{order}/despachar |
| `cancel()` | PATCH | /pedidos/{order}/cancelar |
| `deliveryIndex()` | GET | /pedidos/delivery |
| `confirmDelivery()` | PATCH | /ventas/{sale}/delivery-cobrado |
| `collectPending()` | PATCH | /ventas/{sale}/cobrar-pendiente |

**Request validated fields:**
- `store()`: client_name, client_type, items[].product_id, items[].quantity_value, notes
- `collect()`: payment_method_id, amount_bs, reference, rate
- `cancel()`: motivo
- `collectPending()`: payments[], rate

**Inertia::render props (`index()`):**
- pedidosActivos, historial, cobrosPendientes, products, paymentMethods, paymentTerminals, todayRate, kpis

---

### ReportController
| Método | Verb | Ruta |
|--------|------|------|
| `index()` | GET | /reportes |
| `sales()` | GET | /reportes/ventas (JSON) |
| `inventory()` | GET | /reportes/inventario (JSON) |
| `closings()` | GET | /reportes/cierres (JSON) |
| `orders()` | GET | /reportes/pedidos (JSON) |
| `dayReport()` | GET | /reportes/dia (JSON) |
| `exportDayPdf()` | GET | /reportes/pdf-dia (PDF) |
| `consolidated()` | GET | /reportes/consolidado |
| `consolidatedData()` | GET | /reportes/consolidado/data (JSON) |
| `export()` | GET | /reportes/exportar (XLSX) |

▲ **buildDayData() — costo con pool stock_product_id:**
```php
$costProductId = $item->product?->stock_product_id ?? $item->product_id;
$costPerKg     = (float) ($avgCosts[$costProductId] ?? 0);
```
Premium/Primera/Segunda usan el costo de 'Carne del Canal' para calcular utilidad correctamente.

**Filtros comunes:** date_from, date_to, cashier_id, payment_method, status, ▲ branch_id

---

### ClientController
| Método | Verb | Ruta |
|--------|------|------|
| `index()` | GET | /clientes |
| `store()` | POST | /clientes |
| `update()` | PUT | /clientes/{client} |
| `show()` | GET | /clientes/{client} |
| `search()` | GET | /clientes/buscar (JSON) |

**Request validated fields:**
- `store()/update()`: cedula, name, phone, email, address, notes

---

### SettingsController
| Método | Verb | Ruta |
|--------|------|------|
| `general()` | GET | /configuracion/general |
| `updateGeneral()` | POST | /configuracion/general |
| `cashRegisters()` | GET | /configuracion/cajas |
| `storeCashRegister()` | POST | /configuracion/cajas |
| `updateCashRegister()` | PUT | /configuracion/cajas/{cashRegister} |
| `destroyCashRegister()` | DELETE | /configuracion/cajas/{cashRegister} |
| `terminals()` | GET | /configuracion/terminales |
| `storeTerminal()` | POST | /configuracion/terminales |
| `updateTerminal()` | PUT | /configuracion/terminales/{terminal} |
| `destroyTerminal()` | DELETE | /configuracion/terminales/{terminal} |
| `ticket()` | GET | /configuracion/ticket |
| `updateTicket()` | POST | /configuracion/ticket |
| ▲ `hardware()` (closure) | GET | /configuracion/hardware |
| `branches()` | GET | /configuracion/sucursales |
| `storeBranch()` | POST | /configuracion/sucursales |
| `updateBranch()` | PUT | /configuracion/sucursales/{branch} |
| `users()` | GET | /configuracion/usuarios |
| `storeUser()` | POST | /configuracion/usuarios |
| `updateUser()` | PUT | /configuracion/usuarios/{user} |
| `destroyUser()` | DELETE | /configuracion/usuarios/{user} |
| `setManualRate()` | POST | /tasa/manual |

---

### PaymentMethodController
| Método | Verb | Ruta |
|--------|------|------|
| `index()` | GET | /configuracion/metodos-pago |
| `store()` | POST | /configuracion/metodos-pago |
| `update()` | PUT | /configuracion/metodos-pago/{paymentMethod} |
| `toggle()` | PATCH | /configuracion/metodos-pago/{paymentMethod}/toggle |
| `destroy()` | DELETE | /configuracion/metodos-pago/{paymentMethod} |
| `reorder()` | POST | /configuracion/metodos-pago/reorder |

---

### ContingencyController
| Método | Verb | Ruta |
|--------|------|------|
| `index()` | GET | /contingencia |
| `downloadForm()` | GET | /contingencia/formato-papel |
| `downloadTemplate()` | GET | /contingencia/plantilla-ventas |
| `downloadInventoryTemplate()` | GET | /contingencia/plantilla-inventario |
| `importSales()` | POST | /contingencia/importar-ventas |
| `importInventory()` | POST | /contingencia/importar-inventario |

---

### OnboardingController
| Método | Verb | Ruta |
|--------|------|------|
| `show()` | GET | /setup |
| `store()` | POST | /setup/{step} |

---

### ▲ TeamController (NUEVO)
| Método | Verb | Ruta |
|--------|------|------|
| `index()` | GET | /configuracion/equipo (aprox.) |
| `store()` | POST | — |
| `update()` | PUT | — |
| `toggleActive()` | PATCH | — |
| `killSession()` | PATCH | — |
| `destroy()` | DELETE | — |

Gestión de usuarios del equipo (toggle activo, matar sesión, CRUD).

---

### ▲ BranchController (NUEVO)
| Método | Verb | Ruta |
|--------|------|------|
| `index()` | GET | — |
| `store()` | POST | — |
| `update()` | PUT | — |
| `assignUser()` | PATCH | /sucursales/{branch}/asignar |
| `unassignUser()` | PATCH | /sucursales/{branch}/desasignar |

Asignación de usuarios a sucursales.

---

## 2. Models

### Business
**fillable:** name, legal_name, rif, logo_path, address, city, state, phone, currency_default, rate_source, rate_margin, weight_unit, ticket_prefix, ticket_footer, sale_capture_mode, line_input_mode, preticket_enabled, preticket_expiry_minutes, price_lock_policy, onboarding_completed, active, max_branches, settings, theme_color

▲ **Nueva columna DB:** `subscription_active` (boolean, default true) — kill switch del sistema. Usada por CheckSubscription middleware.

▲ **Columnas ahora nullable:** legal_name, rif, theme_color, phone, city, state, address (fix 2026-05-23).

**casts:** rate_margin:decimal:2, preticket_enabled:bool, onboarding_completed:bool, active:bool, max_branches:int, settings:array

**relaciones:**
| Tipo | Método | Modelo |
|------|--------|--------|
| hasMany | users() | User |
| hasMany | branches() | Branch |
| hasMany | categories() | Category |
| hasMany | products() | Product |
| hasMany | inventoryEntries() | InventoryEntry |
| hasMany | cashRegisters() | CashRegister |
| hasMany | sales() | Sale |
| hasMany | orders() | Order |
| hasMany | activityLogs() | ActivityLog |
| hasMany | paymentMethods() | PaymentMethod |
| hasMany | paymentTerminals() | PaymentTerminal |

---

### User
**fillable:** name, email, password, business_id, branch_id, role, theme, is_active, session_token, access_start, access_end, access_days

▲ **Nueva columna DB:** `is_hidden` (boolean, default false) — oculta usuario de listings públicos (usado por super_admin).

**roles activos:** super_admin, owner, branch_admin, supervisor, analyst, cashier, admin

**casts:** email_verified_at:datetime, password:hashed, access_days:array

**relaciones:**
| Tipo | Método | Modelo |
|------|--------|--------|
| belongsTo | business() | Business |
| belongsTo | branch() | Branch |
| hasMany | sales() | Sale (FK: cashier_id) |
| hasMany | orders() | Order (FK: created_by) |

**helpers de rol:** isSuperAdmin(), isOwner(), isAdmin(), isCashier(), hasRole(), canManageBusiness(), canVoidSales(), seesTodasLasSucursales()

---

### Product
▲ **fillable actualizado:** business_id, branch_id, category_id, subcategory_id, name, sku, barcode, sale_mode, base_unit_label, fraction_allowed, price_per_kg_usd, price_per_unit_usd, min_stock, location, image_path, sort_order, active, fabricable, is_favorite, **stock_product_id**

▲ **stock_product_id:** unsignedBigInteger nullable. Cuando != null, el descuento de inventario (pay/cancel) y el cálculo de costos (buildDayData) se hacen contra ese product_id en lugar del producto vendido. Patrón "pool de stock". Premium, Primera y Segunda apuntan a 'Carne del Canal'.

**casts:** fraction_allowed:bool, fabricable:bool, price_per_kg_usd:decimal:2, price_per_unit_usd:decimal:2, active:bool, is_favorite:bool

**relaciones:**
| Tipo | Método | Modelo |
|------|--------|--------|
| belongsTo | business() | Business |
| belongsTo | branch() | Branch |
| belongsTo | category() | Category |
| belongsTo | subcategory() | Subcategory |
| hasMany | inventoryEntries() | InventoryEntry |
| hasMany | saleItems() | SaleItem |
| hasMany | orderItems() | OrderItem |

---

### Sale
**fillable:** business_id, ticket_number, status, total_usd, payment_method, amount_received_usd, change_usd, rate_used, total_bs, notes, sold_at, cashier_id, cash_register_id, cancelled_at, cancelled_by, cancellation_reason, client_name, client_phone, client_id, origin, channel, delivery_status, delivery_confirmed_at, payment_status, order_id

▲ **Nueva columna DB:** `accounting_date` (date nullable) — fecha contable para ventas después del corte bancario (7pm → contabiliza el día siguiente).

**with:** items (eager)

**relaciones:**
| Tipo | Método | Modelo |
|------|--------|--------|
| belongsTo | business() | Business |
| belongsTo | cashier() | User (FK: cashier_id) |
| belongsTo | cashRegister() | CashRegister |
| belongsTo | canceller() | User (FK: cancelled_by) |
| belongsTo | order() | Order |
| hasMany | items() | SaleItem |
| hasMany | salePayments() | SalePayment |

---

### SaleItem
**fillable:** sale_id, product_id, product_name, input_type, quantity_value, unit_label, price_per_kg_usd, price_per_unit_usd, subtotal_usd, subtotal_bs, rate_used, discount_usd

**relaciones:** belongsTo sale(), belongsTo product()

---

### Order
**fillable:** business_id, client_name, client_type, status, total_usd, notes, created_by

**with:** items (eager)

**relaciones:**
| Tipo | Método | Modelo |
|------|--------|--------|
| belongsTo | business() | Business |
| belongsTo | creator() | User (FK: created_by) |
| hasMany | items() | OrderItem |
| hasOne | sale() | Sale |

---

### CashRegister
**fillable:** business_id, branch_id, name, opened_at, closed_at, opening_amount_usd, opening_amount_bs, expected_cash_usd, counted_cash_usd, difference_usd, rate_at_opening, notes, opened_by, closed_by

▲ **Columnas ahora nullable:** opened_at, opening_amount_usd, opened_by (fix 2026-05-22).

**relaciones:**
| Tipo | Método | Modelo |
|------|--------|--------|
| belongsTo | business() | Business |
| belongsTo | branch() | Branch |
| belongsTo | opener() | User (FK: opened_by) |
| belongsTo | closer() | User (FK: closed_by) |
| hasMany | sales() | Sale |
| hasMany | movements() | CashMovement |

---

### CashMovement
**fillable:** cash_register_id, type (in/out/corte), amount_usd, amount_bs, concept, created_by

**relaciones:** belongsTo cashRegister(), belongsTo creator() (User)

---

### InventoryEntry
**fillable:** business_id, product_id, boveda_entry_id, quantity_kg, waste_kg, cost_per_kg_usd, supplier, notes, location, entered_at, created_by

**casts:** quantity_kg:decimal:3, waste_kg:decimal:3, net_kg:decimal:3 (columna virtual DB)

**relaciones:** belongsTo business(), belongsTo product(), belongsTo bovedaEntry(), belongsTo creator() (User)

---

### BovedaEntry
**fillable:** business_id, product_type, description, kg_entrada, costo_usd, waste_kg, kg_surtido_vitrina, supplier, entered_at, closed_at, despiece_completado_at

▲ **Nueva columna DB:** `pair_id` (unsignedBigInteger nullable) — apunta al ID de la entrada hermana en el par Canal 1/Canal 2. Ambas entradas se referencian mutuamente.

**casts:** kg_entrada:decimal:3, costo_usd:decimal:2, waste_kg:decimal:3, kg_surtido_vitrina:decimal:3, kg_disponible:decimal:3 (GENERATED VIRTUAL = kg_entrada - kg_surtido_vitrina - waste_kg)

**relaciones:** belongsTo business(), hasMany inventoryEntries(), hasOne bovedaProduct() (FK: name↔product_type)

**scope:** scopeActive() → whereNull('closed_at')

---

### BovedaProduct
**fillable:** business_id, name, unit, active, sort_order, requires_despiece, vitrina_product_id

**Catálogo Chaguaramas activo:**
- RES - Medio Canal (requires_despiece: true)
- POLLO - Entero Congelado (requires_despiece: false)
- CERDO - Canal (requires_despiece: true)
- Jamón Pierna Sellado (requires_despiece: true)

**relaciones:** belongsTo business()

---

### FabricaBatch
**fillable:** business_id, created_by, output_product_id, output_kg, output_units, input_cost_usd, notes, produced_at

**relaciones:** belongsTo business(), belongsTo creator() (User), belongsTo outputProduct() (Product), hasMany inputs() (FabricaInput)

---

### FabricaInput
**fillable:** fabrica_batch_id, product_id, despiece_item_id, inventory_entry_id, label, quantity_kg, cost_usd

**relaciones:** belongsTo batch() (FabricaBatch), belongsTo product(), belongsTo despieceItem(), belongsTo inventoryEntry()

---

### Category
**fillable:** business_id, name, icon, color, macro_category, sort_order, active

**macro_category valores Chaguaramas:** BOVEDA, RES, POLLO, CERDO, CHARCUTERIA, TRASTES, DESPENSA

**relaciones:** belongsTo business(), hasMany subcategories() (ordered by sort_order), hasMany products()

---

### Client
**fillable:** business_id, cedula, name, phone, email, address, notes, active

**relaciones:** belongsTo business(), hasMany sales()

---

### Branch
**fillable:** business_id, name, address, city, phone, is_active, access_start, access_end

**relaciones:** belongsTo business(), hasMany users(), hasMany sales(), hasMany cashRegisters()

---

### ActivityLog
**fillable:** business_id, user_id, action, model_type, model_id, old_values, new_values, ip_address

**casts:** old_values:array, new_values:array

**relaciones:** belongsTo business(), belongsTo user()

---

### DollarRate
**fillable:** rate, source (bcv/parallel/negotiated/manual), currency_type (USD/EUR), effective_from, effective_until, is_active

**scopes:** scopeUsd(), scopeEur()

**nota:** UPDATED_AT = null | Conexión readonly `synticorex` DB (SYNTIWEB_DB_*)

---

### PaymentMethod
**fillable:** business_id, name, type, bank_name, is_active, sort_order

**relaciones:** belongsTo business()

---

## 3. Services

### DollarRateService
| Método | Firma | Propósito |
|--------|-------|-----------|
| `getTodayRate()` | `(string $source = 'bcv'): float` | Tasa del día, fallback a última disponible |
| `getLatestRate()` | `(string $source = 'bcv'): float` | Última tasa activa sin importar fecha |
| `fetchAndStore()` | `(): array{success, rate?, source?, message}` | Consulta APIs y persiste nueva tasa USD |
| `storeManualRate()` | `(float $rate): bool` | Graba tasa manual del admin |
| `formatBs()` | `(float $usd, float $rate): float` | usd × rate, redondeado a 2 decimales |
| `getSources()` | `(): string[]` | ['bcv', 'parallel', 'negotiated', 'manual'] |

**Constantes:** FALLBACK = 40.00 | MAX_CHANGE_PCT = 60% | CACHE_TTL = 3600s

---

### CurrencyFetcherService
| Método | Firma | Propósito |
|--------|-------|-----------|
| `fetchUSD()` | `(): array{success, rate, source}` | BCV oficial USD — dolarapi.com → brecha-cambiaria.com |
| `fetchEUR()` | `(): array{success, rate, source}` | BCV oficial EUR — mismas fuentes |

---

## 4. Middleware

| Clase | Alias | Propósito |
|-------|-------|-----------|
| `EnsureRole` | `role` | Verifica que `user->role` esté en los roles permitidos, abort 403 si no |
| `CheckOnboarding` | `check.onboarding` | Redirige a /setup si business no tiene onboarding_completed |
| `EnforceUserSession` | (global) | Verifica is_active, sesión única por token, días habilitados, ventana horaria |
| `HandleInertiaRequests` | (global) | Inyecta auth.user, flash, tasa, banking_alert en shared props de Inertia |
| ▲ `CheckSubscription` | `subscription` | Kill switch: si business.subscription_active=false → logout + mensaje mantenimiento |

**Stack middleware autenticado:**  `['auth', 'verified', 'check.onboarding', 'subscription']`

---

## 5. Artisan Commands

| Comando | Clase | Propósito |
|---------|-------|-----------|
| `dollar:fetch` | UpdateDollarRate | Consulta BCV y persiste tasa USD/EUR |
| ▲ `cash:banking-alert` | BankingAlertCommand | Guarda alerta corte bancario en caché (--minutes=20\|10\|0) |
| `demo:reset` | ResetDemoData | Resetea datos demo (desarrollo) |

**Alerta bancaria:** El comando escribe en cache `banking_alert` → HandleInertiaRequests lo inyecta en shared props → AppLayout lo muestra como banner global en POS.

---

## 6. Rutas

### Públicas (sin auth)
| URI | Verb | Controller@método | Nombre |
|-----|------|-------------------|--------|
| / | GET | closure (Welcome) | — |
| /setup | GET | OnboardingController@show | onboarding |
| /setup/{step} | POST | OnboardingController@store | onboarding.step |

### Autenticadas — middleware base: `auth, verified, check.onboarding, subscription`

#### Todos los roles (`super_admin,admin,owner,branch_admin,supervisor,analyst,cashier`)
| URI | Verb | Controller@método | Nombre |
|-----|------|-------------------|--------|
| /dashboard | GET | DashboardController@index | dashboard |
| /dashboard/data | GET | DashboardController@data | dashboard.data |
| ▲ /set-branch | POST | closure | branch.set |
| /caja/cierre | GET | CashRegisterController@dayClose | cash.day-close |
| /pos | GET | SaleController@index | pos.index |
| /pos/ventas | POST | SaleController@store | sales.store |
| /pos/ventas/{sale}/pagar | PATCH | SaleController@pay | sales.pay |
| /pos/ventas/{sale}/cancelar | PATCH | SaleController@cancel | sales.cancel |
| /ventas | GET | SaleController@historial | sales.index |
| /caja | GET | CashRegisterController@index | cash.index |
| /caja/abrir | POST | CashRegisterController@open | cash.open |
| /caja/{register}/cerrar | POST | CashRegisterController@close | cash.close |
| /caja/{register}/movimiento | POST | CashRegisterController@movement | cash.movement |
| /clientes/buscar | GET | ClientController@search | clients.search |
| /clientes | GET | ClientController@index | clients.index |
| /clientes | POST | ClientController@store | clients.store |
| /clientes/{client} | GET | ClientController@show | clients.show |
| /clientes/{client} | PUT | ClientController@update | clients.update |
| /pedidos | GET | OrderController@index | orders.index |
| /pedidos/delivery | GET | OrderController@deliveryIndex | orders.delivery |
| /pedidos | POST | OrderController@store | orders.store |
| /pedidos/{order}/cobrar | PATCH | OrderController@collect | orders.collect |
| /pedidos/{order}/despachar | PATCH | OrderController@dispatch | orders.dispatch |
| /pedidos/{order}/cancelar | PATCH | OrderController@cancel | orders.cancel |
| /pedidos/{sale}/delivery-cobrado | PATCH | OrderController@confirmDelivery | sales.delivery-confirm |
| /ventas/{sale}/cobrar-pendiente | PATCH | OrderController@collectPending | sales.collect-pending |
| /profile | GET | ProfileController@edit | profile.edit |
| /profile | PATCH | ProfileController@update | profile.update |
| /profile | DELETE | ProfileController@destroy | profile.destroy |

#### Solo `super_admin, owner`
| URI | Verb | Controller@método | Nombre |
|-----|------|-------------------|--------|
| /reportes/consolidado | GET | ReportController@consolidated | reports.consolidated |
| /reportes/consolidado/data | GET | ReportController@consolidatedData | reports.consolidated-data |

#### `super_admin,admin,owner,branch_admin,supervisor,analyst`
| URI | Verb | Nombre |
|-----|------|--------|
| /tasa/manual | POST | rate.manual |
| /caja/cierre/{register} | POST | cash.confirm-close |
| /ventas/{sale}/anular | PATCH | sales.void |
| /catalogo | GET | catalog.index |
| /catalogo/productos | POST | catalog.store |
| /catalogo/productos/{product} | PUT | catalog.update |
| /catalogo/productos/{product} | DELETE | catalog.destroy |
| /catalogo/productos/{product}/favorito | PATCH | catalog.product.favorite |
| ▲ /catalogo/importar | POST | catalog.import |
| /catalogo/categorias | POST/PUT/DELETE | catalog.category.* |
| /catalogo/subcategorias | POST/PUT/DELETE | catalog.subcategory.* |
| /fabrica | GET/POST | fabrica.index / fabrica.store |
| /fabrica/despiece | POST | fabrica.despiece |
| /inventario | GET/POST | inventory.index / inventory.store |
| /boveda | GET/POST | boveda.index / boveda.store |
| /boveda/{entry}/surtir | PATCH | boveda.surte |
| /boveda/{entry}/cerrar | PATCH | boveda.close |
| /boveda/{entry}/merma | PATCH | boveda.merma |
| /boveda/{entry}/plantilla | GET | boveda.plantilla |
| /boveda/productos | POST/PUT/DELETE | boveda.product.* |
| /reportes | GET + JSON endpoints | reports.* |
| /configuracion/metodos-pago | GET/POST/PUT/PATCH/DELETE | payment-methods.* |
| /configuracion/general | GET/POST | settings.general |
| /configuracion/cajas | GET/POST/PUT/DELETE | settings.cash-registers.* |
| /configuracion/terminales | GET/POST/PUT/DELETE | settings.terminals.* |
| /configuracion/ticket | GET/POST | settings.ticket |
| ▲ /configuracion/hardware | GET | settings.hardware |
| /configuracion/sucursales | GET/POST/PUT | settings.branches.* |
| /contingencia | GET + POST importar | contingency.* |

#### Solo `super_admin`
| URI | Verb | Nombre |
|-----|------|--------|
| /configuracion/usuarios | GET/POST/PUT/DELETE | settings.users.* |

---

## 7. Roles y Permisos (AppLayout.vue)

```javascript
const rolePermissions = {
    super_admin:  // todos
    owner:        ['dashboard','pos','inventory','boveda','fabrica','orders','sales','dayclose','catalog','clients','contingency','users','settings','cash'],
    branch_admin: ['dashboard','pos','inventory','boveda','fabrica','orders','sales','dayclose','catalog','clients','contingency','users','settings','cash'],
    supervisor:   ['dashboard','pos','cash','sales','dayclose','inventory','catalog','boveda','fabrica','orders','clients','reports','contingency'],
    analyst:      ['dashboard','sales','dayclose','cash','reports','inventory','catalog','clients','orders','contingency'],
    admin:        // todos excepto super_admin features
    cashier:      // pos, caja, pedidos, clientes
}
```

**navOwner:** Nav alternativo para owner y branch_admin — prioriza Panel Empresarial arriba.

---

## 8. Vue Pages

### POS/Index.vue
**props:** products, categories, cashRegister, todayRate, paymentMethods, ticketPrefix, stockMap, posShowKg, businessInfo, ticketPrefs

**refs principales:** tickets (multi-ticket), activeTicket, selectedCat, search, soloConStock, qtyModal, qtyProduct, payModal, payments, saleOrigin, showClientFields, clientId, clientName, clientPhone, successModal, successItems, showMobileCart

---

### Boveda/Index.vue
**props:** activas, historial, bovedaProducts, productosVitrina, kpis

**refs principales:** tab, flash, showEntradaModal, entradaForm, showSurtirModal, surtirEntry, surtirForm, surtirErrors, despiecePendiente, closing, showProductModal, editingProduct, productForm, localBovedaProducts, showHelp

▲ **entradaForm ahora incluye:** conCanal2 (boolean), kg_par (number) — visibles solo cuando product_type === 'RES - Medio Canal'

---

### Fabrica/Index.vue
**props:** fabricables, ingredientes, stockMap, historial, despiecePendiente, despieceHistorial

**refs principales:** tab, showModal, modalProduct, ingredSearch, despieceExpanded, despieceForms, despieceErrors, despieceSaving, despieceFlash, despiecePdfEntry, showHelp

▲ **helpSteps actualizado:** Menciona 'Carne del Canal, Costilla, Hueso Redondo, Hueso Rojo' como los 4 cortes Res (Premium/Primera/Segunda eliminados del texto).

---

### Cash/Index.vue
**props:** cashRegister, allOpenRegisters, history, kpis, todayRate, isAdmin

**refs principales:** activeTab, openModal, movModal, corteModal, showHelp

---

### Catalog/Index.vue
**props:** categories, products

▲ **Nuevo:** Botón importar productos (CSV/Excel) → POST /catalogo/importar. Botón descarga plantilla → GET /catalogo/plantilla-productos.

**refs principales:** activeTab, searchQuery, showModal, editProduct, submitting, selectedImagePreview, mainTab, showCatModal, editCategory, showSubModal, editSubcat, subParentId, showHelp

---

### Inventory/Index.vue
**props:** products, categories, todayEntries, stockMap, lastEntryMap, kpis

---

### Dashboard.vue
**props:** ventas_hoy, top_productos, stock_critico, ultimas_ventas, caja_activa, tasa_hoy, pedidos_pendientes, categorias_hoy, utilidad_boveda

---

### Sales/Index.vue
**props:** sales, totals, cashiers, paymentMethods, filters

---

### Orders/Index.vue
**props:** pedidosActivos, historial, cobrosPendientes, products, paymentMethods, paymentTerminals, todayRate, kpis

---

### Clients/Index.vue
**props:** clients, selectedClient (show mode), salesHistory

---

### Reports/Index.vue
**props:** paymentMethods, cashiers

---

### Reports/Consolidado.vue
**props:** branches, initialData

---

### Settings/Hardware.vue ▲ (NUEVA)
Página de configuración de hardware (scanner EAN-13, balanza, impresora térmica). Sin props externas — informativa.

---

### Contingency/Index.vue
**props:** (sin props externas — descarga archivos)

---

### Auth/* (Login, Register, ForgotPassword, ResetPassword, ConfirmPassword, VerifyEmail)
**props:** status, errors — componentes Breeze estándar

---

## 9. Migraciones

| Archivo | Tabla | Operación |
|---------|-------|-----------|
| 0001_01_01_000000_create_users_table | users | CREATE |
| 0001_01_01_000001_create_cache_table | cache, cache_locks | CREATE |
| 0001_01_01_000002_create_jobs_table | jobs, job_batches, failed_jobs | CREATE |
| 2026_05_09_000001 | businesses | CREATE |
| 2026_05_09_000002 | users | ADD business_id |
| 2026_05_09_000003 | categories | CREATE |
| 2026_05_09_000004 | subcategories | CREATE |
| 2026_05_09_000005 | products | CREATE (name, sku, sale_mode, price_per_kg_usd, price_per_unit_usd, location, active…) |
| 2026_05_09_000006 | inventory_entries | CREATE (product_id, quantity_kg, waste_kg, net_kg virtual, cost_per_kg_usd…) |
| 2026_05_09_000007 | cash_registers | CREATE |
| 2026_05_09_000008 | sales | CREATE (ticket_number, status, total_usd, total_bs, rate_used…) |
| 2026_05_09_000009 | sale_items | CREATE (snapshots: product_name, price_per_kg_usd…) |
| 2026_05_09_000010 | orders | CREATE |
| 2026_05_09_000011 | order_items | CREATE |
| 2026_05_09_000012 | cash_movements | CREATE |
| 2026_05_09_000013 | activity_logs | CREATE |
| 2026_05_09_000014 | businesses | ADD settings JSON, rate_margin… |
| 2026_05_10_000001 | dollar_rates | CREATE (rate, source, currency_type, effective_from, is_active) |
| 2026_05_10_000010 | payment_methods | CREATE |
| 2026_05_10_000013 | sale_payments | CREATE |
| 2026_05_10_000014 | sales | ADD client_name, client_phone, client_id |
| 2026_05_10_000015 | clients | CREATE |
| 2026_05_11_000001 | businesses | ADD theme_color |
| 2026_05_11_000002 | payment_terminals | CREATE |
| 2026_05_12_000001 | users | ADD role, theme |
| 2026_05_12_000002 | users | CHANGE role a ENUM |
| 2026_05_12_000010 | inventory_entries | ADD location |
| 2026_05_12_000011 | despiece_logs | CREATE |
| 2026_05_12_000012 | despiece_items | CREATE |
| 2026_05_12_000013 | sales | ADD delivery_status, delivery fields |
| 2026_05_12_000014 | products | ADD location |
| 2026_05_13_000015 | boveda_entries | CREATE |
| 2026_05_13_000016 | boveda_entries | NORMALIZE (agregar kg_surtido_vitrina, refactor) |
| 2026_05_13_000017 | boveda_products | CREATE |
| 2026_05_13_000018 | despiece_items | ADD tipo |
| 2026_05_13_165047 | boveda_entries | ADD waste_kg |
| 2026_05_13_190001 | inventory_entries | ADD boveda_entry_id |
| 2026_05_13_190002 | boveda_entries | ADD kg_disponible GENERATED VIRTUAL |
| 2026_05_13_190003 | sale_items | ADD subtotal_bs |
| 2026_05_13_200001 | categories | ADD macro_category |
| 2026_05_13_200002 | fabrica_batches | CREATE |
| 2026_05_13_200003 | fabrica_inputs | CREATE |
| 2026_05_13_210001 | products | ADD fabricable |
| 2026_05_13_210002 | fabrica_inputs | ADD product_id |
| 2026_05_13_220001 | branches | CREATE |
| 2026_05_13_220002 | users | EXPAND roles ENUM |
| 2026_05_13_220003 | sales, inventory_entries, etc. | ADD branch_id |
| 2026_05_13_230001 | products | ADD cost_per_unit_usd |
| 2026_05_14_000001 | sales | ADD payment_status, order_id |
| 2026_05_14_010001 | businesses | ADD max_branches |
| 2026_05_14_050743 | sales | ADD 'credit' al ENUM origin |
| 2026_05_14_065526 | products | ADD branch_id |
| 2026_05_14_071527 | users | ADD team fields (position, avatar…) |
| 2026_05_14_074358 | users | ADD access_days JSON |
| 2026_05_14_080924 | clients | RENAME client_code → cedula |
| 2026_05_14_100001 | cash_registers | ADD opening_amount_bs |
| 2026_05_14_180427 | boveda_products | ADD requires_despiece, vitrina_product_id |
| 2026_05_14_194421 | boveda_entries | ADD despiece_completado_at |
| 2026_05_15_000001 | products | DROP cost fields legacy |
| 2026_05_16_000001 | cash_movements | ADD 'corte' al ENUM type |
| 2026_05_16_000002 | cash_movements | ADD amount_bs |
| 2026_05_16_000003 | products | ADD is_favorite |
| ▲ 2026_05_22_000001 | cash_registers | NULLABLE: opened_at, opening_amount_usd, opened_by |
| ▲ 2026_05_22_214705 | users | ADD is_hidden (boolean, default false) |
| ▲ 2026_05_23_000001 | businesses | ADD subscription_active (boolean, default true) |
| ▲ 2026_05_23_000002 | sales | ADD accounting_date (date nullable) |
| ▲ 2026_05_23_123937 | businesses | FIX NULLABLE: legal_name, rif, theme_color, phone, city, state, address |
| ▲ 2026_05_24_000001 | boveda_entries | ADD pair_id (unsignedBigInteger nullable) |
| ▲ 2026_05_24_000002 | products | ADD stock_product_id (unsignedBigInteger nullable) |

**Total: 72 migraciones** (era 65)

---

## 10. Stress Test

**Archivo:** `stress_test.php` (raíz del proyecto)
**Total fases: 18** (era 16)

| Fase | Módulo | Estado |
|------|--------|--------|
| 1 | Auth + DollarRateService | ✅ |
| 2 | Bóveda: Entradas, Surtidos, Límites | ✅ |
| 3 | Fábrica: Despiece y Validaciones | ✅ |
| 4 | POS: Ventas, Pagos, Anulaciones | ✅ |
| 5 | Cierre de Caja y Utilidad | ✅ |
| 6 | InventoryController | ✅ |
| 7 | OrderController | ✅ |
| 8 | ClientController | ✅ |
| 9 | ReportController | ✅ |
| 10 | SettingsController + PaymentMethodController | ✅ |
| 11 | Configuración Ticket | ✅ |
| 12 | Configuración General | ✅ |
| 13 | Sucursales (storeBranch) | ✅ |
| 14 | Contingencia (importSales) | ✅ |
| 15 | Dashboard data endpoint | ✅ |
| 16 | CatalogController::importProducts() | ✅ |
| ▲ 17 | FabricaController::index() — props despiecePendiente | ✅ (3 subtests: RES/POLLO/CERDO) |
| ▲ 18 | Configuración completa: 18.1 General / 18.2 Cajas / … | En desarrollo |

**Convención:** Fixtures del test usan prefijo `[ST]` en description/name para cleanup al final.

---

## 11. Seeders

| Seeder | Propósito |
|--------|-----------|
| `DatabaseSeeder` | Orquestador principal |
| `PaymentMethodSeeder` | Métodos de pago base: efectivo Bs, efectivo USD, transferencia, pago móvil, punto de venta |
| `CatalogSeeder` | Categorías y productos genéricos de demostración |
| `CatalogSeederChaguaramas` | ▲ Catálogo real Chaguaramas actualizado: catMap corregido, resItems sin legacy, pool 'Carne del Canal', stock_product_id asignado a Premium/Primera/Segunda |
| `ChaguaramasBaseSeeder` | Datos base del negocio piloto: business, admin user, configuración |
| `InventorySeeder` | Entradas de inventario de prueba para vitrina |
| `TestFlowSeeder` | Flujo completo A→Z (22 checks): boveda → despiece → vitrina → POS → cierre |

**Catálogo Chaguaramas — Categorías:**

| Categoría | Color | macro_category |
|-----------|-------|----------------|
| Bóveda | #64748B | BOVEDA |
| Res | #EF4444 | RES |
| Pollo | #2563EB | POLLO |
| Cerdo | #8B5CF6 | CERDO |
| Charcutería | #06B6D4 | CHARCUTERIA |
| Trastes | #F97316 | TRASTES |
| Víveres | #10B981 | DESPENSA |

**Pool stock Res:** 'Carne del Canal' (active=false, location=vitrina, sort_order=99) ← Premium, Primera, Segunda apuntan aquí vía stock_product_id.

---

## 12. Variables de entorno (.env keys)

```
APP_NAME / APP_ENV / APP_KEY / APP_DEBUG / APP_URL
APP_LOCALE / APP_FALLBACK_LOCALE / APP_FAKER_LOCALE
LOG_CHANNEL / LOG_LEVEL
DB_CONNECTION / DB_HOST / DB_PORT / DB_DATABASE / DB_USERNAME / DB_PASSWORD
SYNTIWEB_DB_HOST / SYNTIWEB_DB_PORT / SYNTIWEB_DB_DATABASE
SYNTIWEB_DB_USERNAME / SYNTIWEB_DB_PASSWORD
DOLLAR_FALLBACK_RATE
SESSION_DRIVER / SESSION_LIFETIME / SESSION_ENCRYPT / SESSION_PATH / SESSION_DOMAIN
BROADCAST_CONNECTION / FILESYSTEM_DISK / QUEUE_CONNECTION / CACHE_STORE
MAIL_MAILER / MAIL_HOST / MAIL_PORT / MAIL_USERNAME / MAIL_PASSWORD / MAIL_FROM_ADDRESS
VITE_APP_NAME
```

**Claves críticas:**
- `SYNTIWEB_DB_*` → conexión readonly a synticorex (dollar_rates)
- `DOLLAR_FALLBACK_RATE` → tasa de último recurso (default 40.00)

---

## 13. Comandos VPS

```bash
# Conectar
ssh -i C:\Users\carbo\.ssh\id_ed25519 root@187.124.241.213

# Deploy completo
cd /var/www/syntimeat
git pull origin main
npm run build
php artisan migrate --force
php artisan config:cache
php artisan route:cache

# Kill switch — apagar
php artisan tinker --execute="DB::table('businesses')->where('id',1)->update(['subscription_active'=>0]);"

# Kill switch — encender
php artisan tinker --execute="DB::table('businesses')->where('id',1)->update(['subscription_active'=>1]);"

# Tasa BCV
php artisan dollar:fetch

# Alerta bancaria (ejecutar con cron a las 6:40pm, 6:50pm, 7:00pm)
php artisan cash:banking-alert --minutes=20
php artisan cash:banking-alert --minutes=10
php artisan cash:banking-alert --minutes=0

# Logs
tail -50 storage/logs/laravel.log
grep "ERROR\|Exception" storage/logs/laravel.log | tail -20
```

---

## 14. Deuda técnica activa (post-entrega)

### Crítico
- [ ] BUG-001: Productos duplicados en vistas (filtro branch_id en session null)
- [ ] BUG-002: Producto creado no aparece en Catálogo (CatalogController branch_id)

### V1.1 (acordado con cliente)
- [ ] Corte bancario configurable desde UI (hora, on/off)
- [ ] Reportes por cajero, por método de pago
- [ ] Paginación reportes (hoy cap 500 filas)
- [ ] CRUD Proveedores
- [ ] Módulo respaldo manual tickets post-apagón
- [ ] Kits/Cestas en Fábrica
- [ ] Email/reset contraseña (Resend)
- [ ] Logo en ticket impreso
- [ ] Scanner EAN-13 calibración con balanza real
- [ ] Ticket térmico 80mm calibración con impresora real
- [ ] FASE 18 stress test completar (config CRUD completo)
- [ ] FASE 19: Multi-rol — cada rol accede solo a lo que debe
- [ ] FASE 20: Multi-sucursal — filtros correctos por branch_id

---

*SYNTIdev — syntimeat — 2026-05-24 — Confidencial*
