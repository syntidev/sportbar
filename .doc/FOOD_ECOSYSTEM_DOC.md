# FOOD ECOSYSTEM — Documentación Técnica Completa
> Producto: ordena.menu (ex SYNTIfood) — Menú digital + Comanda WhatsApp
> Fecha: 2026-05-27 | Base: syntidev/synticorex rama main

---

## 1. Arquitectura General

```
┌─────────────────────────────────────────────────────────────────────┐
│  DOMINIO: ordena.menu                                               │
│                                                                     │
│  Marketing       Onboarding              Tenant landing             │
│  ordena.menu/    ordena.menu/crear        {sub}.ordena.menu/         │
│  planes,demos    (auth requerido)        TenantRendererController   │
│                        │                        │                   │
│                   OnboardingController    food.blade.php (1816 líneas)│
│                   storeFood()            ├ Hero slider               │
│                        │                ├ Menú por categorías        │
│                   TenantBootstrapFood    ├ Cart (drawer)             │
│                   (crea carpetas + JSON) ├ Checkout modal            │
│                        │                └ Comanda → WA URL           │
│                   ┌────▼─────┐                   │                   │
│                   │menu.json │    POST /{sub}/food-checkout          │
│                   │tenants/  │         │                             │
│                   │{id}/menu │   ComandaController                   │
│                   └──────────┘         │                             │
│                                  ComandaService                      │
│                                  SF-XXXX.json                        │
│                                        │                             │
│                                   WA URL → cliente                   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  DASHBOARD (auth, tenant.owner middleware)                          │
│                                                                     │
│  /tenant/{id}/dashboard                                             │
│  ├── Tab: Tu Menú  → menu-section.blade.php                        │
│  │   ├── CRUD categorías → Food\CategoriesController               │
│  │   ├── CRUD ítems      → Food\ItemsController                    │
│  │   └── Import xlsx/csv → ItemsController@import                  │
│  ├── Tab: Comandas → comandas-section.blade.php                    │
│  │   ├── Plan food-vision: persiste JSON                           │
│  │   └── Plan inferior: genera SF-XXXX pero borra archivo          │
│  └── API pública menú: GET /menu/{subdomain}                       │
│      → MenuController@show → menu.json                             │
└─────────────────────────────────────────────────────────────────────┘
```

**Storage por tenant:**
```
storage/app/tenants/{tenant_id}/
├── menu/
│   ├── menu.json              ← fuente de verdad del menú
│   ├── fotos/                 ← fotos de categorías
│   └── items/
│       └── {item_id}.webp     ← fotos de ítems
└── comandas/
    └── {year}/{month}/
        └── SF-XXXXXX.json     ← solo food-vision persiste
```

---

## 2. Modelos y Base de Datos

### 2.1 Tenant (`app/Models/Tenant.php`)

Campos relevantes para food:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `brand_key` | string | `'ordena'` si viene de ordena.menu, `'syntiweb'` si es SYNTIweb |
| `base_domain` | string | `'ordena.menu'` o `'syntiweb.com'` — determina la URL pública |
| `subdomain` | string | Identificador único: `{subdomain}.{base_domain}` |
| `business_segment` | string | Tipo de negocio (restaurant, arepera, etc.) |
| `settings` | array (cast) | `['engine_settings' => ['template' => 'food']]` |
| `whatsapp_sales` | string | WhatsApp principal (+58...) |
| `whatsapp_support` | string | WhatsApp soporte (opcional) |
| `whatsapp_active` | string | `'sales'` o `'support'` — cuál responde pedidos |
| `is_open` | boolean | Estado del negocio (abierto/cerrado) |
| `business_hours` | array (cast) | Horarios por día de la semana |

**Métodos clave:**
```php
$tenant->getActiveWhatsapp(): ?string
// Retorna whatsapp_sales o whatsapp_support según whatsapp_active

$tenant->isAtLeastCrecimiento(): bool
// Slugs food: food-oportunidad=false, food-crecimiento/food-vision=true

$tenant->isVision(): bool
// Slug food-vision = true — habilita persistencia de comandas
```

**Relaciones:**
- `plan()` → `BelongsTo<Plan>` — slug food-oportunidad / food-crecimiento / food-vision
- `customization()` → `HasOne<TenantCustomization>` — hero, colores, logo, payment_methods
- `domains()` → `HasMany<Domain>` — custom domains (Plan Visión)

### 2.2 Product (`app/Models/Product.php`)

> **NOTA:** Product es usado por SYNTIstudio y SYNTIcat, pero NO por food. Food usa `menu.json` exclusivamente.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `tenant_id` | int | FK con tenant_id obligatorio |
| `name` | string | Nombre del producto |
| `description` | string | Descripción |
| `price_usd` | decimal:2 | Precio en REF |
| `compare_price_usd` | decimal:2 | Precio original (tachado) |
| `price_bs` | decimal:2 | Precio en bolívares |
| `image_filename` | string | Nombre de archivo en storage |
| `position` | int | Orden de visualización |
| `is_active` | boolean | Visible en storefront |
| `is_featured` | boolean | Aparece en sección "Destacados" |
| `badge` | string | `popular`, `nuevo`, `promo`, `destacado` |
| `category_id` | int | FK a ProductCategory (nullable) |

**Métodos:**
```php
$product->getAllImageUrls(int $tenantId): array
// Retorna [main_url, gallery_url_1, gallery_url_2] (Plan 3)
```

### 2.3 ProductCategory (`app/Models/ProductCategory.php`)

> Usado por SYNTIstudio/SYNTIcat. Food usa categorías en `menu.json`, no en BD.

| Campo | Descripción |
|-------|-------------|
| `tenant_id` | FK tenant |
| `parent_id` | Self-referencia (subcategorías) |
| `name` | Nombre |
| `order` | Posición en listado |

**Scopes:**
```php
->scopeForTenant($query, $tenantId)  // filtra por tenant
->scopeRoots($query)                 // solo categorías raíz (parent_id = null)
```

---

## 3. Servicios Core

### 3.1 MenuService (`app/Services/MenuService.php`)

**Responsabilidad:** CRUD completo sobre `menu.json`. Es la fuente de verdad del menú food. No toca la base de datos.

**Archivo:** `storage/app/tenants/{id}/menu/menu.json`

**Schema del JSON:**
```json
{
  "tenant_id": 7,
  "blueprint": "food",
  "categories": [
    {
      "id": "cat-AB12",
      "nombre": "Pizzas",
      "foto": "menu/fotos/cat-AB12.webp",
      "activo": true,
      "items": [
        {
          "id": "item-CD34",
          "nombre": "Pizza Margarita",
          "precio": 8.50,
          "descripcion": "Con tomate y mozzarella",
          "image_path": "menu/items/item-CD34.webp",
          "badge": "popular",
          "is_featured": true,
          "activo": true
        }
      ]
    }
  ],
  "created_at": "2026-01-15T10:00:00Z",
  "updated_at": "2026-05-20T14:30:00Z"
}
```

**Límites por plan:**
| Plan slug | `items` | `photos` (fotos de categoría) |
|-----------|---------|-------------------------------|
| food-oportunidad | 50 | 6 |
| food-crecimiento | 100 | 12 |
| food-vision | 150 | 18 |

**Métodos públicos:**

```php
// Lectura
MenuService::limits(int $planId): array          // ['items' => 50, 'photos' => 6]
getMenu(int $tenantId): array                    // JSON completo normalizado
getCategories(int $tenantId): array              // array de categorías
getCategory(int $tenantId, string $catId): ?array

// Categorías
createCategory(int $tenantId, array $data): array   // $data: ['nombre', 'foto']
updateCategory(int $tenantId, string $catId, array $data): ?array
deleteCategory(int $tenantId, string $catId): bool

// Ítems
createItem(int $tenantId, string $catId, array $data): ?array
updateItem(int $tenantId, string $catId, string $itemId, array $data): ?array
deleteItem(int $tenantId, string $catId, string $itemId): bool

// Agregados
countItems(int $tenantId): int                   // total de ítems en todas las categorías
rebuild(int $tenantId): array                    // fuerza re-escritura del JSON
```

**Flujo interno:**
1. `getMenu()` lee el archivo, aplica `normalizeCategory()` / `normalizeItem()` (migración de keys legacy en inglés → español)
2. `normalizeCategory()` además ordena: items `is_featured = true` primero
3. Toda mutación llama `persist()` → `Storage::disk('local')->put()`
4. IDs generados: `cat-XXXX` y `item-XXXX` con 4 caracteres random A-Z0-9

### 3.2 OrderService (`app/Services/OrderService.php`)

**Responsabilidad:** Generar y persistir órdenes de carrito (SYNTIcat/lleva.app).  
**NOTA:** NO es el servicio de comandas food. Es para el carrito de SYNTIcat (plan cat-vision).

**Archivo de salida:** `storage/app/tenants/{id}/orders/{year}/{month}/SC-XXXXXX.json`

**Schema de orden:**
```json
{
  "id": "SC-AB1234",
  "tenant_id": 7,
  "tenant_name": "Mi Tienda",
  "date": "2026-05-27T14:30:00+00:00",
  "customer": {
    "name": "María López",
    "phone": "584121234567",
    "location": "Av. Principal, Casa 5"
  },
  "items": [
    {"title": "Camisa azul", "qty": 2, "price": 15.00, "variant": "Talla M"}
  ],
  "subtotal": 30.00,
  "currency": "REF",
  "channel": "whatsapp"
}
```

**Métodos:**
```php
generateId(int $tenantId): string    // SC- + 6 chars, verifica unicidad contra archivos existentes
generate(Tenant $tenant, array $customer, array $items): array
save(int $tenantId, array $order): void
```

### 3.3 ComandaService (`app/Services/ComandaService.php`)

**Responsabilidad:** Generar y persistir comandas food (solo plan food-vision persiste).

**Archivo de salida:** `storage/app/tenants/{id}/comandas/{year}/{month}/SF-XXXXXX.json`

**Schema de comanda:**
```json
{
  "id": "SF-XY5678",
  "tenant_id": 7,
  "date": "2026-05-27T14:30:00+00:00",
  "customer_name": "Carlos Pérez",
  "customer_phone": "+584141234567",
  "modalidad": "delivery",
  "delivery_address": "Av. Principal, Casa 5",
  "table_number": "",
  "items": [
    {"nombre": "Pizza Margarita", "qty": 2, "precio": 8.50}
  ],
  "total": 17.00,
  "channel": "whatsapp"
}
```

**Modalidades válidas:** `sitio` | `llevar` | `delivery`

**Métodos:**
```php
generateId(int $tenantId): string
generate(Tenant $tenant, string $customerName, string $modalidad, array $items,
         string $customerPhone='', string $deliveryAddress='', string $tableNumber=''): array
save(int $tenantId, array $comanda): void
```

### 3.4 WhatsappMessageBuilder (`app/Services/WhatsappMessageBuilder.php`)

**Responsabilidad:** Construir el texto del mensaje y la URL `wa.me` para órdenes de carrito.  
> Para comandas food, `ComandaController` construye el mensaje inline.

```php
build(array $order): string
// Ejemplo de salida:
// 🛒 Orden SC-AB1234 — Mi Tienda
// ────────────────────────────
// 🛍 Camisa azul (Talla M) x2 — REF 30,00
// ────────────────────────────
// 💰 Subtotal: REF 30,00
//
// 👤 María López
// 📱 584121234567
// 📍 Av. Principal, Casa 5

url(string $message, string $waNumber): string
// https://wa.me/584141234567?text=...
```

### 3.5 TenantBootstrapFood (`app/Services/TenantBootstrapFood.php`)

**Responsabilidad:** Inicializar el sistema de archivos food al crear un tenant.

```php
// 1. Crea directorios
TenantBootstrapFood::bootstrap(Tenant $tenant): void
// Crea: tenants/{id}/menu/
// Crea: tenants/{id}/menu/fotos/
// Crea: tenants/{id}/menu/menu.json (solo si no existe)
// Estructura inicial del JSON:
// { "tenant_id": X, "blueprint": "food", "categories": [], "created_at": ..., "updated_at": ... }

// 2. Agrega primera categoría con ítems del wizard
TenantBootstrapFood::addInitialCategory(Tenant $tenant, string $categoryName, array $items): void
// $items: [{ "nombre"|"name": ..., "precio"|"price": ..., "descripcion": ... }]
// Los ítems vacíos (nombre = '') son filtrados
// La categoría siempre recibe id = 1 (entero, no string) en bootstrap inicial
```

---

## 4. Controllers y Endpoints

### 4.1 Food\MenuController

**Responsabilidad:** API pública del menú.

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/menu/{subdomain}` | No | Retorna JSON completo del menú |

**Respuesta:**
```json
{
  "success": true,
  "menu": { "categories": [...] }
}
```
**Errores:** `404` con `{"success":false,"error":"tenant_not_found"}`

### 4.2 Food\CategoriesController

Inyecta `MenuService`. Rutas bajo `/tenant/{tenantId}/food/categories`.

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/tenant/{id}/food/categories` | Lista categorías |
| POST | `/tenant/{id}/food/categories` | Crear categoría |
| PUT | `/tenant/{id}/food/categories/{catId}` | Actualizar categoría |
| DELETE | `/tenant/{id}/food/categories/{catId}` | Eliminar categoría |

**POST validación:**
- `nombre`: required, string, max:120
- `foto`: nullable, string, max:255

**Gating de plan en POST:**
- Cuenta fotos de categorías con `foto` no nulo
- Si `currentPhotos >= limits['photos']` → `422 photo_limit_reached`

### 4.3 Food\ItemsController

Inyecta `MenuService` + `ImageUploadService`. Rutas bajo `/tenant/{tenantId}/food/categories/{category}/items`.

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `.../items` | Lista ítems de una categoría |
| POST | `.../items` | Crear ítem |
| PUT | `.../items/{itemId}` | Actualizar ítem |
| DELETE | `.../items/{itemId}` | Eliminar ítem |
| POST | `/tenant/{id}/food/items/import` | Importar xlsx/csv |

**POST validación de ítem:**
- `nombre`: required, string, max:200
- `precio`: required, numeric, min:0
- `descripcion`: nullable, string, max:200
- `badge`: nullable, string, max:50
- `is_featured`: nullable, boolean
- `imagen`: nullable, file, mimes:jpg,jpeg,png,webp, max:2048
- `options`: nullable, json — máx 8 opciones, `{id, label, price_add}`, label max:80, price_add max:50

**Gating de plan en POST:**
- `MenuService::countItems()` vs `limits['items']`
- Si `currentItems >= limits['items']` → `422 item_limit_reached`

**Imágenes:**
- Procesada por `ImageUploadService::processWithCustomFilename()`
- Guardada en: `storage/public/tenants/{id}/menu/items/{itemId}.webp`
- Tamaño máx: 800px
- `image_path` en JSON: `"menu/items/{itemId}.webp"` (relativa a tenants/{id}/)

**Import xlsx/csv:**
- Columnas: `[0] categoría, [1] nombre, [2] precio, [3] descripción`
- Fila 1 es header (se salta)
- Respeta límite de plan durante importación
- Crea categorías nuevas si no existen
- Cache interno de categorías para evitar releer el JSON en cada fila

### 4.4 Food\ComandaController

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/{subdomain}/food-checkout` | No (throttle:10,1) | Genera comanda + URL WhatsApp |

**Validación:**
- `customer_name`: required, string, max:120
- `customer_phone`: nullable, string, max:30
- `modalidad`: required, in:sitio,llevar,delivery
- `delivery_address`: nullable, string, max:300
- `table_number`: nullable, string, max:100
- `items[].nombre`: required, string, max:200
- `items[].qty`: required, integer, min:1
- `items[].precio`: required, numeric, min:0

**Lógica:**
1. Verifica negocio abierto con `BusinessHoursService::isOpen()`
2. Si cerrado → `422` con `error: 'closed'`
3. Genera comanda con `ComandaService::generate()`
4. **Plan gate:** Solo `food-vision` persiste el JSON. Otros planes: archivo se crea y se borra inmediatamente
5. Construye mensaje WA inline (NO usa `WhatsappMessageBuilder`)
6. Retorna `{ success: true, comanda_id: "SF-...", whatsapp_url: "https://wa.me/..." }`

**Respuesta:**
```json
{
  "success": true,
  "comanda_id": "SF-XY5678",
  "whatsapp_url": "https://wa.me/58412XXXXXXX?text=..."
}
```

### 4.5 OrdersController

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/tenant/{tenantId}/orders` | auth, tenant.owner | Dashboard: lista órdenes CAT |

**NOTA:** Este controller es para SYNTIcat (plan `cat-vision`), no para food.
- Si el plan NO es `cat-vision` → retorna vista con `orders: [], isPlanAnual: false`
- Si es `cat-vision` → lee todos los `.json` de `tenants/{id}/orders/`, ordena por fecha DESC

### 4.6 CheckoutController

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/{subdomain}/checkout` | No (throttle:10,1) | Carrito WhatsApp SYNTIcat |

**NOTA:** Solo funciona para plan `cat-vision`. Food usa `food-checkout`, no este endpoint.
- Valida teléfono venezolano: `^58(412|414|416|422|424|426)\d{7}$`
- Genera orden con `OrderService`, construye WA URL con `WhatsappMessageBuilder`

---

## 5. Rutas

### 5.1 Dominio ordena.menu (onboarding food)

```php
// Auth requerida
Route::domain('ordena.menu')->middleware(['web', 'auth'])->group(function () {
    Route::get('/crear',               [OnboardingController::class, 'food'])        ->name('onboarding.ordena.crear');
    Route::post('/crear/guardar',      [OnboardingController::class, 'storeFood'])   ->name('onboarding.ordena.store');
    Route::get('/crear/subdomain-check', [OnboardingController::class, 'checkSubdomain']) ->name('onboarding.ordena.subdomain-check');
    Route::get('/crear/{tenant}/preview', [OnboardingController::class, 'preview'])  ->name('onboarding.ordena.preview');
    Route::post('/crear/{tenant}/publicar', [OnboardingController::class, 'publish'])->name('onboarding.ordena.publish');
});
```

### 5.2 SYNTIweb — rutas de onboarding food (redirect)

```php
Route::middleware(['auth'])->group(function () {
    // Redirect a ordena.menu
    Route::get('/onboarding/food', fn() => redirect('https://ordena.menu/crear', 301))->name('onboarding.food');
    Route::post('/onboarding/food/guardar', fn() => redirect('https://ordena.menu/crear', 301));
});
```

### 5.3 Motor de comandas food (público)

```php
// POST /{subdomain}/food-checkout — throttle:10,1
Route::post('/{subdomain}/food-checkout', [Food\ComandaController::class, 'store'])
    ->middleware(['web', 'throttle:10,1'])
    ->where('subdomain', '[a-z0-9-]+')
    ->name('food.checkout');
```

### 5.4 API del menú (público)

```php
Route::get('/menu/{subdomain}', [Food\MenuController::class, 'show'])
    ->where('subdomain', '[a-z0-9-]+')
    ->name('food.menu.public');
```

### 5.5 Dashboard food (auth + tenant.owner)

```php
Route::middleware(['auth', 'verified', 'tenant.owner:tenantId'])
    ->prefix('tenant/{tenantId}/food')
    ->group(function () {
        Route::apiResource('categories', CategoriesController::class)->except(['show']);
        // genera: GET/POST /categories, PUT/DELETE /categories/{category}

        Route::apiResource('categories.items', ItemsController::class)->except(['show']);
        // genera: GET/POST /categories/{category}/items, PUT/DELETE /categories/{category}/items/{item}

        Route::post('/items/import', [ItemsController::class, 'import'])->name('tenant.food.items.import');
    });
```

### 5.6 Landing pública

```php
// Subdominio: tortas.ordena.menu
Route::domain('{subdomain}.ordena.menu')
    ->middleware('tenant')
    ->get('/', [TenantRendererController::class, 'show'])
    ->name('tenant.ordena.landing');
```

---

## 6. Vistas y Storefront

### 6.1 `landing/templates/food.blade.php` (1816 líneas)

**Extiende:** `landing.base`
**Propósito:** Storefront público del menú digital

**Variables disponibles (desde TenantRendererController):**

| Variable | Tipo | Descripción |
|----------|------|-------------|
| `$tenant` | Tenant | Modelo completo con plan, customization |
| `$customization` | TenantCustomization | Logo, hero images, payment_methods, social |
| `$menu` | array | Categorías + ítems desde `menu.json` normalizado |
| `$savedDisplayMode` | string | `reference_only` / `bolivares_only` / `both_toggle` / `hidden` |
| `$currencySettings` | array | Símbolos y config de moneda |
| `$dollarRate` | float | Tasa BCV actual |
| `$euroRate` | float | Tasa euro actual |
| `$hidePrice` | bool | Si `true` oculta precios |
| `$isOpen` | bool | Estado del negocio |
| `$showCart` | bool | Habilitar carrito (plan food-anual/visión) |

**Secciones del template:**

1. **Hero Slider** — Hasta 5 imágenes: `hero_main_filename`, `hero_secondary_filename`, `hero_tertiary_filename`, `hero_image_4_filename`, `hero_image_5_filename`
2. **Business Info** — Logo circular flotante, nombre, estado abierto/cerrado, dirección
3. **Sticky Bar** — Fila identidad (aparece al scroll) + fila navegación (lupa, hamburger, tabs de categorías, info, carrito)
4. **Menu View** — Sección "Destacados" (ítems con `is_featured=true` o badge en [popular, nuevo, promo, destacado]) + lista de categorías con grid de ítems
5. **Detail View** — Vista de detalle de ítem (imagen, nombre, precio, notas, qty+add)
6. **Drawer Pedido** — Panel lateral deslizable, solo si `$isPlanAnual` (`food-oportunidad/crecimiento/vision`)
7. **Modal Datos Cliente** — Nombre, teléfono, modalidad (sitio/llevar/delivery), dirección delivery, número de mesa
8. **Footer Storefront** — `@include('landing.sections.footer-storefront')`

**Plan `$isPlanAnual`** (habilita carrito):
```php
$isPlanAnual = in_array($planSlug, ['food-oportunidad', 'food-crecimiento', 'food-vision', 'food-anual']);
```

**Flujo de carrito (JavaScript):**
- `addToCart(id, name, price, img)` — agrega al carrito
- `addToCartWithOptions(id, name, price, selectedOptions)` — agrega con variantes (cartKey = `id|opt1|opt2`)
- `changeQty(id, delta)` — +/- cantidad
- `toggleDrawer()` — abre/cierra drawer con scroll-lock iOS-safe
- `sendWhatsApp()` — abre modal de datos cliente
- `confirmDataAndSend()` — valida teléfono venezolano + modalidad → POST `/{subdomain}/food-checkout` → abre URL WA

**Badges de ítems:**
| Badge | Color | Ícono |
|-------|-------|-------|
| `popular` | amber | tabler--star-filled |
| `nuevo` | green | tabler--sparkles |
| `promo` | orange | tabler--tag |
| `destacado` | purple | tabler--bolt |

### 6.2 `dashboard/components/menu-section.blade.php`

**Propósito:** Tab "Tu Menú" del dashboard food
**Variables consumidas:** `$menu` (array de categorías desde JSON), `$plan`, `$tenant`

**Variables PHP computadas:**
```php
$limits = MenuService::limits($plan->id)
// → ['items' => N, 'photos' => N]
$totalItems = suma de items en todas las categorías
$pct = porcentaje de uso del límite
$menuItemsJson / $menuCatsJson = JSON serializado para Alpine.js
```

**Componente Alpine:** `x-data="menuSection(@js($menuItemsJson), @js($menuCatsJson), {{ $menuMaxItems }}, {{ $tenant->id }})"` — gestiona filtrado por categoría, paginación, CRUD de ítems y categorías.

**`window.__menuCategories`** — global JS inyectado para acceso externo.

### 6.3 `dashboard/components/comandas-section.blade.php`

**Propósito:** Tab "Comandas" del dashboard — listado en tiempo real con auto-refresh
**Variables consumidas:** `$comandas` (array), `$isFoodAnual` (bool), `$customization`, `$tenant`

**Plan gate:**
- Si `!$isFoodAnual` → muestra "Plan Visión requerido" con lock icon
- Si `$isFoodAnual` → muestra listado de comandas SF-XXXX con auto-polling

**Modalidades mostradas:** sitio → "Comer en sitio" | llevar → "Para llevar" | delivery → "Delivery"

**Endpoint de polling:** `GET /tenant/{id}/comandas-json` → `DashboardController::getComandasJson()`  
**Endpoint de acción:** `POST /tenant/{id}/comandas/{comandaId}/action`

### 6.4 `dashboard/components/orders-section.blade.php`

**Propósito:** Tab "Pedidos" del dashboard — lista órdenes SC-XXXX de SYNTIcat  
**NOTA:** A pesar de estar en el proyecto, esto es para SYNTIcat (`cat-vision`), no para food.

### 6.5 `onboarding/wizard-food.blade.php`

**Propósito:** Wizard multi-paso para crear un tenant food
**Brand-aware** — detecta si viene de ordena.menu:

```php
$isOrdena     = isset($brand) && $brand->key === 'ordena';
$displayName  = $isOrdena ? 'Ordena' : 'SYNTIfood';
$domainSuffix = $isOrdena ? 'ordena.menu' : 'syntiweb.com';
$logoSrc      = $isOrdena ? asset('brand/ordena/ordena-logo-flat-positive.svg')
                           : asset('brand/syntiweb-logo-positive.svg');
$storeRoute   = $isOrdena ? route('onboarding.ordena.store') : url('/onboarding/food/guardar');
```

**Colores según brand:**
```php
$foodColor = $isOrdena ? '#E85D26' : '#f97316';
$foodDark  = $isOrdena ? '#cc4a1a' : '#ea6c0c';
$foodLight = $isOrdena ? '#fff3ec' : '#fff7ed';
```

**Pasos del wizard:** (3 pasos)
1. Tipo de negocio + nombre + subdominio + WhatsApp
2. Selección de plan
3. Primera categoría + ítems demo

---

## 7. Flujo Completo de una Comanda (paso a paso)

```
1. Cliente navega a {subdomain}.ordena.menu
   └─ TenantRendererController resuelve tenant por subdomain + middleware tenant
   └─ Renderiza food.blade.php con $menu desde menu.json

2. Cliente explora el menú
   └─ Categorías con tabs sticky (scroll + hamburger)
   └─ Clic en ítem → sfOpenDetail() → vista de detalle
   └─ Agrega al carrito: addToCart() o addToCartWithOptions()

3. Cliente abre drawer (toggleDrawer())
   └─ renderDrawer() muestra ítems, cantidades, total en REF o Bs

4. Cliente pulsa "Enviar por WhatsApp"
   └─ sendWhatsApp() → abre modal datos cliente

5. Cliente llena formulario:
   └─ Nombre (opcional según $customerFields)
   └─ Teléfono venezolano (validación regex 58(412|414|416|422|424|426)XXXXXXX)
   └─ Modalidad: sitio / llevar / delivery
   └─ Si delivery: dirección (manual o geolocalización)
   └─ Si sitio: número de mesa

6. confirmDataAndSend():
   └─ POST /{subdomain}/food-checkout
   └─ Payload: { customer_name, customer_phone, modalidad, delivery_address,
                 table_number, items: [{nombre, qty, precio}] }

7. ComandaController@store:
   a. Valida campos
   b. Resuelve tenant por subdomain
   c. BusinessHoursService::isOpen() → si cerrado, retorna 422
   d. ComandaService::generate() → crea objeto comanda con SF-XXXXXX
   e. ComandaService::save() → escribe SF-XXXXXX.json
   f. Si plan NO es food-vision → borra el archivo (solo el ID queda en memoria)
   g. Construye mensaje WhatsApp (inline)
   h. Construye URL wa.me/{número}?text={mensaje}
   i. Retorna { success: true, comanda_id, whatsapp_url }

8. Frontend recibe URL → window.location.href = whatsapp_url
   └─ Abre WhatsApp nativo con mensaje prellenado
   └─ Cliente envía al restaurante

9. Restaurante recibe mensaje con ID SF-XXXXXX
   └─ Dashboard: tab Comandas muestra la comanda (si plan food-vision)
   └─ Acción: marcar como "en proceso" / "listo" / "entregado"
```

---

## 8. Flujo de Onboarding Food

```
1. Usuario llega a ordena.menu/crear (autenticado)
   └─ SmartRedirect en SocialAuthController lo dirige aquí tras login
   └─ Middleware auth verifica sesión del dominio ordena.menu

2. OnboardingController@food():
   a. Verifica ONBOARDING_MODE === 'admin' (sino redirect /register)
   b. $plans = getPlansForBlueprint('food') → planes food-oportunidad/crecimiento/vision
   c. $brand = BrandConfig::for(BrandConfig::resolveFromHost('ordena.menu'))
      → $brand->key = 'ordena'
   d. Renderiza wizard-food.blade.php

3. Usuario completa el wizard:
   - Paso 1: tipo negocio (restaurant/arepera/sweets/delivery/other)
             nombre del negocio, subdominio (validado via AJAX)
             WhatsApp, ciudad
   - Paso 2: selección de plan food
   - Paso 3: primera categoría + ítems demo (JSON serializado en hidden input)

4. POST ordena.menu/crear/guardar → OnboardingController@storeFood():
   a. Validación:
      - business_name: required
      - business_type: in:[restaurant,arepera,sweets,delivery,other]
      - plan_id: existe en plans con blueprint=food
      - subdomain: min:5, regex, unique:tenants
      - whatsapp_sales: required, normalizado a +58...
      - first_category: required, max:100
      - items: required JSON string

   b. Límite: max 5 tenants por cuenta
   c. Anti-trial: no puede tener 2 trials food activos
   d. $isOrdena = host === 'ordena.menu'

   e. DB::transaction():
      1. Tenant::create():
         - base_domain: 'ordena.menu' (si isOrdena)
         - brand_key: 'ordena'
         - settings: ['engine_settings' => ['template' => 'food']]
         - status: 'active'
         - trial_ends_at: now() + 15 días
         - subscription_ends_at: now() + 15 días
         - edit_pin: bcrypt('1234')

      2. TenantCustomization::create():
         - hero_layout: 'gradient'
         - content_blocks.hero.title = business_name
         - content_blocks.hero.cta_text = 'Ver menú'

      3. TenantBootstrapFood::bootstrap($tenant)
         → crea storage/app/tenants/{id}/menu/
         → crea storage/app/tenants/{id}/menu/fotos/
         → crea menu.json vacío

      4. TenantBootstrapFood::addInitialCategory($tenant, $first_category, $items)
         → añade categoría + ítems al menu.json

   f. Mail::to(user->email)->send(TrialWelcomeMail($tenant))

5. Redirect → onboarding.preview ($tenant->id)
   └─ Muestra preview del sitio con botón "Publicar"

6. POST /onboarding/{tenant}/publicar → publish():
   └─ tenant->update(['status' => 'active'])
   └─ Redirect → /tenant/{id}/dashboard
```

---

## 9. Integración WhatsApp

### 9.1 Comanda (food)

Mensaje construido en `ComandaController@store` (inline):
```
🍽 Comanda SF-XY5678

• Pizza Margarita x2 — REF 17,00
• Refresco x1 — REF 2,50

Total: REF 19,50

Nombre: Carlos Pérez
Modalidad: Delivery
```

Número usado: `$tenant->getActiveWhatsapp()` → si null → `whatsapp_sales` → `phone`

### 9.2 Orden de carrito (cat)

Mensaje construido por `WhatsappMessageBuilder::build()`:
```
🛒 Orden SC-AB1234 — Mi Tienda
────────────────────────────
🛍 Camisa azul (Talla M) x2 — REF 30,00
────────────────────────────
💰 Subtotal: REF 30,00

👤 María López
📱 584121234567
📍 Av. Principal, Casa 5
```

### 9.3 Limpieza del número

```php
// En ambos casos:
preg_replace('/\D/', '', $waNumber)
// Ejemplo: "+58 412-123 4567" → "584121234567"
// URL: https://wa.me/584121234567?text=...
```

---

## 10. Variables de Configuración por Tenant

### 10.1 En tabla `tenants`

| Campo | Valor food |
|-------|------------|
| `base_domain` | `'ordena.menu'` |
| `brand_key` | `'ordena'` |
| `settings.engine_settings.template` | `'food'` |
| `business_segment` | restaurant, arepera, sweets, delivery, other |

### 10.2 En tabla `tenant_customizations`

| Campo | Descripción |
|-------|-------------|
| `hero_layout` | `'gradient'` por defecto en onboarding |
| `hero_main_filename` | Foto principal del hero |
| `hero_secondary_filename` ... `hero_image_5_filename` | Slider (hasta 5 fotos) |
| `logo_filename` | Logo circular en storefront |
| `payment_methods` | `{global: [...], currency: [...], details: {...}}` |
| `customer_required_fields` | `['name']` o `['name','phone']` — campos obligatorios en checkout |
| `social_networks` | `{instagram, facebook, tiktok}` |
| `about_text` | Texto "Acerca de" en modal info |

### 10.3 Límites de plan food

| Plan | slug | items | fotos cat | Comandas persistidas |
|------|------|-------|-----------|---------------------|
| Oportunidad | food-oportunidad | 50 | 6 | No |
| Crecimiento | food-crecimiento | 100 | 12 | No |
| Visión | food-vision | 150 | 18 | Sí (SF-XXXX en JSON) |

---

## 11. Checklist para Replicar en Nuevo Producto

### 11.1 Dominio y DNS

- [ ] Apuntar nuevo dominio al servidor VPS
- [ ] Wildcard DNS `*.nuevoproducto.tld` para subdominos de tenants
- [ ] SSL configurado para dominio raíz y wildcard

### 11.2 Modelos

- [ ] Si el nuevo producto usa JSON como food: no se necesita nueva tabla
- [ ] Si usa BD: crear migration + Model con `tenant_id` obligatorio
- [ ] Agregar relación en `Tenant.php`
- [ ] Agregar `brand_key` al fill: nuevo valor ej `'lleva'` ya existe

### 11.3 Servicios

- [ ] Crear `TenantBootstrap{Producto}.php` con `bootstrap()` y `addInitialX()`
- [ ] Crear servicio de datos si es JSON (similar a `MenuService`) o usar Eloquent si es BD
- [ ] No duplicar `WhatsappMessageBuilder` — reusar existente
- [ ] Crear servicio de comanda/orden específico si tiene ticket distinto (prefijo SF- / SC-)

### 11.4 Controllers

- [ ] `Food\*Controller` → clonar namespace para `{Producto}\*Controller`
- [ ] `OnboardingController` → agregar método `{producto}()` y `store{Producto}()`
  - Verificar `$isNuevoProducto = host === 'nuevoproducto.tld'`
  - `base_domain` y `brand_key` correctos
  - Llamar `TenantBootstrap{Producto}::bootstrap()` y `addInitialX()`
- [ ] `CheckoutController` equivalente o reusar según lógica de negocio

### 11.5 Rutas

- [ ] Grupo `Route::domain('nuevoproducto.tld')->middleware(['web','auth'])` → onboarding
- [ ] Grupo `Route::domain('nuevoproducto.tld')->middleware(['web'])` → marketing
- [ ] Subdomain landing: `Route::domain('{subdomain}.nuevoproducto.tld')->middleware('tenant')`
- [ ] Motor checkout: `Route::post('/{subdomain}/nuevo-checkout', ...)` con throttle:10,1
- [ ] Dashboard CRUD: `Route::prefix('tenant/{tenantId}/nuevo')` con apiResource
- [ ] API pública: `GET /nuevo-data/{subdomain}`
- [ ] Ruta redirect en SYNTIweb: `Route::get('/onboarding/nuevo', fn() => redirect('https://nuevoproducto.tld/crear', 301))->name('onboarding.nuevo')`

### 11.6 Vistas

- [ ] `landing/templates/{producto}.blade.php` — storefront público
  - `@extends('landing.base')`
  - Variables: `$tenant`, `$customization`, `$menu`/datos, `$savedDisplayMode`, etc.
- [ ] `dashboard/components/{producto}-section.blade.php` — tab en dashboard
- [ ] `onboarding/wizard-{producto}.blade.php` — wizard brand-aware
  - Detectar brand desde `$brand->key`
  - Colores, logo, dominio variables

### 11.7 Onboarding selector

- [ ] Agregar card al `onboarding/selector.blade.php`
  - CSS con color brand (hover + active + btn + btn-hover)
  - `h2` con nombre de marca y punto de color
  - Badge, pills, descripción
  - `route('onboarding.nuevo')`
- [ ] Agregar auto-redirect en `<body>`:
  ```php
  $isNuevo = str_contains($host, 'nuevoproducto.tld');
  ```

### 11.8 SocialAuthController / smartRedirect

- [ ] Agregar `$baseDomain = 'nuevoproducto.tld'` en la lógica de `$baseDomain`
- [ ] Agregar `$isNuevo` con `str_contains($origin, 'nuevoproducto.tld')`
- [ ] Ruta de fallback wizard: `route('lleva.onboarding.nuevo')` o equivalente

### 11.9 TenantsController

- [ ] Agregar `brand_key === 'nuevo'` → `$createRoute = route('onboarding.nuevo')`

### 11.10 Storage

- [ ] `TenantBootstrap{Producto}::bootstrap()` debe crear:
  - `storage/app/tenants/{id}/{producto}/`
  - Archivo JSON inicial con `blueprint: '{producto}'`

### 11.11 Plans (BD)

- [ ] Crear registros en tabla `plans`:
  - `blueprint`: slug del producto ej `'nuevo'`
  - `slug`: `nuevo-basico`, `nuevo-semestral`, `nuevo-anual`
  - Configurar `price_usd`, `name`, `features`
- [ ] `MenuService::SLUG_LIMITS` → agregar array equivalente en nuevo servicio

### 11.12 BrandConfig

- [ ] Verificar si `BrandConfig::resolveFromHost()` ya maneja el nuevo dominio
- [ ] Agregar logos brand en `public/brand/{nuevo}/`

### 11.13 Deploy

```bash
# VPS post-deploy
git pull origin main
php artisan route:clear
php artisan config:clear
php artisan cache:clear
php artisan view:clear
```

---

*Fin del documento. Generado el 2026-05-27 desde lectura directa del código fuente.*
