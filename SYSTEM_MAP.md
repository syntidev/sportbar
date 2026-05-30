# SYSTEM_MAP — SportBar POS
# ▲ Actualizar este archivo en cada sesión con cambios estructurales
**Generado:** 30/05/2026 | **Commit base:** `d48bf83` | **Versión:** 2.0

---

## 1. HEADER — ENTORNO

| Campo            | Valor                                                    |
|------------------|----------------------------------------------------------|
| **URL prod**     | https://tusport.bar                                      |
| **VPS**          | 187.124.241.213 — PM2 proceso `sportbar`, puerto 3002    |
| **DB**           | MySQL · `sportbar` @ 127.0.0.1:3306                      |
| **Repo**         | https://github.com/syntidev/sportbar                    |
| **Local**        | C:\laragon\www\sportbar                                  |
| **Commit actual**| `d48bf83` — sesión cierre 30/05/2026                     |
| **Versión**      | 2.0 (SYSTEM_MAP — package.json sigue 0.1.0)              |
| **Nombre pkg**   | `SportBar`                                               |

### Stack

| Capa           | Tecnología                                                              |
|----------------|-------------------------------------------------------------------------|
| Framework      | Next.js 14.2.35 · React 18 · TypeScript 5.x (strict)                   |
| Estilos        | CSS Modules · tokens.css · sin Tailwind                                 |
| Animaciones    | Framer Motion 12.x                                                      |
| Componentes    | Radix UI (Dialog, DropdownMenu, Select) · Lucide React                  |
| ORM            | Prisma 5.22 · MySQL                                                     |
| Auth           | jose (JWT HS256) · bcryptjs                                             |
| Realtime       | @supabase/supabase-js 2.x — ▲ **turno activo** (e0e5209)               |
| PWA            | sharp · service worker (pendiente next-pwa)                             |
| Deploy         | PM2 + Nginx + Cloudflare + SSL                                          |
| Otros          | xlsx · zod 4.x · qrcode · recharts · jspdf                             |

---

## 2. ÁRBOL DE RUTAS COMPLETO

### 2a. Rutas UI (page.tsx)

| Ruta UI                    | Archivo                                    | Protegida | Roles            | Estado  |
|----------------------------|--------------------------------------------|-----------|------------------|---------|
| `/`                        | `src/app/page.tsx`                         | ✅ Sí     | Todos            | ✅      |
| `/login`                   | `src/app/login/page.tsx`                   | ❌ No     | —                | ✅      |
| `/menu`                    | `src/app/menu/page.tsx`                    | ❌ No     | Público (QR)     | ✅ ▲    |
| `/pedido/[code]`           | `src/app/pedido/[code]/page.tsx`           | ❌ No     | Público          | ⚠️ ▲    |
| `/pos/nueva-orden`         | `src/app/pos/nueva-orden/page.tsx`         | ✅ Sí     | mesero, admin    | ✅      |
| `/pos/cobrar`              | `src/app/pos/cobrar/page.tsx`              | ✅ Sí     | mesero, admin    | ✅      |
| `/pos/comandas`            | `src/app/pos/comandas/page.tsx`            | ✅ Sí     | mesero, admin    | ✅      |
| `/kds/cocina`              | `src/app/kds/cocina/page.tsx`              | ✅ Sí     | cocina, admin    | ✅ ▲    |
| `/kds/bar`                 | `src/app/kds/bar/page.tsx`                 | ✅ Sí     | bar, admin       | ✅ ▲    |
| `/kds/despacho`            | `src/app/kds/despacho/page.tsx`            | ✅ Sí     | despacho, admin  | ✅      |
| `/admin`                   | `src/app/admin/page.tsx`                   | ✅ Sí     | admin            | ✅      |
| `/admin/turno`             | `src/app/admin/turno/page.tsx`             | ✅ Sí     | admin            | ✅      |
| `/admin/caja`              | `src/app/admin/caja/page.tsx`              | ✅ Sí     | admin            | ✅      |
| `/admin/menu`              | `src/app/admin/menu/page.tsx`              | ✅ Sí     | admin            | ✅      |
| `/admin/equipo`            | `src/app/admin/equipo/page.tsx`            | ✅ Sí     | admin            | ✅      |
| `/admin/estructura`        | `src/app/admin/estructura/page.tsx`        | ✅ Sí     | admin            | ✅ ▲    |
| `/admin/config`            | `src/app/admin/config/page.tsx`            | ✅ Sí     | admin            | ✅      |
| `/admin/partido`           | `src/app/admin/partido/page.tsx`           | ✅ Sí     | admin            | ✅      |
| `/admin/partido/[id]`      | `src/app/admin/partido/[id]/page.tsx`      | ✅ Sí     | admin            | ✅      |
| `/admin/perfil`            | `src/app/admin/perfil/page.tsx`            | ✅ Sí     | admin            | ✅      |
| `/admin/analytics`         | `src/app/admin/analytics/page.tsx`         | ✅ Sí     | admin            | ✅ ▲    |
| `/admin/inventario`        | `src/app/admin/inventario/page.tsx`        | ✅ Sí     | admin            | ✅ ▲    |
| `/admin/marketing`         | `src/app/admin/marketing/page.tsx`         | ✅ Sí     | admin            | ✅ ▲    |
| `/admin/simulator`         | `src/app/admin/simulator/page.tsx`         | ✅ Sí     | admin            | ✅ ▲    |

> ▲ `/pedido/[code]` — vista pública del ticket de orden (en construcción, deuda técnica #21)
> ▲ `/menu` — carrito completo implementado en 3f4a043; flujo → POST /api/orders → confirmación PUB-XXXXX

### 2b. Layouts

| Layout              | Archivo                          | Aplica a          | Descripción                                          |
|---------------------|----------------------------------|-------------------|------------------------------------------------------|
| Root layout         | `src/app/layout.tsx`             | Todo              | HTML root, tokens.css, fonts                         |
| Admin layout        | `src/app/admin/layout.tsx`       | `/admin/**`       | Shell unificado: sidebar 220px desktop + bottom nav mobile · Promise.allSettled(business/me/currency) |

### 2c. Endpoints API (route.ts)

| Endpoint                               | Métodos           | Archivo                                              | Auth   | Descripción                                                  |
|----------------------------------------|-------------------|------------------------------------------------------|--------|--------------------------------------------------------------|
| `/api/auth/session`                    | POST, DELETE      | `api/auth/session/route.ts`                          | ❌     | Login PIN→JWT cookie 12h · Rate limit 5/min/IP · Logout      |
| `/api/auth/pin`                        | POST              | `api/auth/pin/route.ts`                              | ❌     | Verifica PIN sin emitir sesión (uso interno)                  |
| `/api/auth/me`                         | GET               | `api/auth/me/route.ts`                               | ✅     | Devuelve `{id, code, role}` desde JWT cookie                  |
| `/api/orders`                          | GET, POST         | `api/orders/route.ts`                                | ✅     | GET: lista con filtros status/payment/zone/limit · POST: crear orden |
| `/api/orders/[id]/status`              | PATCH             | `api/orders/[id]/status/route.ts`                    | ✅     | Actualiza kitchen_status o payment_status + log               |
| `/api/orders/[id]/ticket`              | GET               | `api/orders/[id]/ticket/route.ts`                    | ✅     | Genera HTML ticket térmico 58/80mm con auto-print             |
| `/api/orders/[id]/cancel`              | POST              | `api/orders/[id]/cancel/route.ts`                    | ✅ admin | Anula orden: payment_status→CANCELLED + CancellationLog      |
| `/api/orders/by-code/[code]`           | GET               | `api/orders/by-code/[code]/route.ts`                 | ❌     | ▲ Busca orden por código PUB-/LOC- (uso /pedido/[code])      |
| `/api/kds`                             | GET               | `api/kds/route.ts`                                   | ✅     | ▲ Órdenes KDS filtradas por venue_zones del usuario logueado  |
| `/api/kds/bump`                        | POST              | `api/kds/bump/route.ts`                              | ✅     | Bump de estación KDS (NUEVO→PREP→LISTO→ENTREGADO)             |
| `/api/kds/routing`                     | GET               | `api/kds/routing/route.ts`                           | ✅     | ▲ Reglas de routing activas (categoría → venue)              |
| `/api/products`                        | GET, POST         | `api/products/route.ts`                              | ✅     | Catálogo activo · Crear producto                              |
| `/api/products/[id]`                   | GET, PUT, PATCH, DELETE | `api/products/[id]/route.ts`                   | ✅     | CRUD producto · PATCH: toggle is_active                       |
| `/api/products/[id]/upload`            | POST              | `api/products/[id]/upload/route.ts`                  | ✅     | Subir foto → WebP · JWT admin requerido                       |
| `/api/products/import`                 | POST              | `api/products/import/route.ts`                       | ✅     | Importar xlsx de productos                                    |
| `/api/categories`                      | GET               | `api/categories/route.ts`                            | ✅     | Lista categorías activas con conteo de productos              |
| `/api/users`                           | GET, POST         | `api/users/route.ts`                                 | ✅     | Listar/crear usuarios                                         |
| `/api/users/[id]`                      | GET, PUT, DELETE  | `api/users/[id]/route.ts`                            | ✅     | CRUD usuario individual                                       |
| `/api/venues`                          | GET, POST         | `api/venues/route.ts`                                | ✅     | Listar/crear venues                                           |
| `/api/venues/[id]`                     | GET, PUT, DELETE  | `api/venues/[id]/route.ts`                           | ✅     | CRUD venue individual                                         |
| `/api/venues/[id]/zones`               | GET, POST, DELETE | `api/venues/[id]/zones/route.ts`                     | ✅     | ▲ Zonas asignadas al venue (VenueZone)                       |
| `/api/venues/[id]/users`               | GET, POST, DELETE | `api/venues/[id]/users/route.ts`                     | ✅     | ▲ Usuarios asignados al venue (VenueUser)                    |
| `/api/venues/[id]/payment-methods`     | GET, POST, DELETE | `api/venues/[id]/payment-methods/route.ts`           | ✅     | ▲ Métodos de pago por venue (VenuePaymentMethod)             |
| `/api/zones`                           | GET, POST         | `api/zones/route.ts`                                 | ✅     | ▲ CRUD zonas del estadio (Zone model)                        |
| `/api/zones/[id]`                      | GET, PUT, DELETE  | `api/zones/[id]/route.ts`                            | ✅     | ▲ CRUD zona individual                                       |
| `/api/inventory`                       | GET, PATCH        | `api/inventory/route.ts`                             | ✅     | ▲ GET: stock todos los productos · PATCH: upsert quantity/unit/min_stock |
| `/api/analytics/track`                 | POST              | `api/analytics/track/route.ts`                       | ❌     | ▲ Registrar evento: page_view / qr_scan / order_placed       |
| `/api/qr/generate`                     | POST              | `api/qr/generate/route.ts`                           | ✅     | ▲ Generar QR del negocio / orden                             |
| `/api/qr/download`                     | GET               | `api/qr/download/route.ts`                           | ✅     | ▲ Descargar QR como PNG/SVG                                  |
| `/api/simulate/*`                      | POST              | `api/simulate/*/route.ts`                            | ✅     | ▲ Simulador de órdenes demo para testing                     |
| `/api/currency`                        | GET               | `api/currency/route.ts`                              | ❌     | Tasa BCV activa · fallback 50.0 Bs./USD                       |
| `/api/currency/manual`                 | POST              | `api/currency/manual/route.ts`                       | ✅     | Registrar tasa manual                                         |
| `/api/config`                          | GET, PATCH        | `api/config/route.ts`                                | ✅     | Config genérica key/value                                     |
| `/api/config/business`                 | GET, PATCH        | `api/config/business/route.ts`                       | ✅     | 23 keys de perfil del negocio y ticket                        |
| `/api/config/business/logo`            | POST              | `api/config/business/logo/route.ts`                  | ✅     | Upload logo → `public/logos/` + actualiza `business_logo_url`|
| `/api/config/hero-slots`               | GET, POST         | `api/config/hero-slots/route.ts`                     | ✅     | ▲ Hero slots del menú público                                |
| `/api/config/hero-slot/[slot]`         | PUT, DELETE       | `api/config/hero-slot/[slot]/route.ts`               | ✅     | ▲ CRUD hero slot individual                                  |
| `/api/config/payment-data`             | GET               | `api/config/payment-data/route.ts`                   | ✅     | Datos de cobro consolidados (métodos + terminales)            |
| `/api/payment-methods`                 | GET, POST         | `api/payment-methods/route.ts`                       | ✅     | Listar/crear métodos de pago dinámicos                        |
| `/api/payment-methods/[id]`            | PUT, DELETE       | `api/payment-methods/[id]/route.ts`                  | ✅     | Editar/eliminar método                                        |
| `/api/payment-methods/[id]/toggle`     | PATCH             | `api/payment-methods/[id]/toggle/route.ts`           | ✅     | Activar/desactivar método                                     |
| `/api/payment-methods/reorder`         | PATCH             | `api/payment-methods/reorder/route.ts`               | ✅     | Reordenar métodos                                             |
| `/api/terminals`                       | GET, POST         | `api/terminals/route.ts`                             | ✅     | Listar/crear terminales POS                                   |
| `/api/terminals/[id]`                  | PUT, DELETE       | `api/terminals/[id]/route.ts`                        | ✅     | Editar/eliminar terminal                                      |
| `/api/turno`                           | GET, POST         | `api/turno/route.ts`                                 | ✅     | Estado turno actual / cerrar turno                            |
| `/api/caja`                            | GET               | `api/caja/route.ts`                                  | ✅     | Reporte de caja del turno                                     |
| `/api/partido`                         | GET, POST         | `api/partido/route.ts`                               | ✅     | Listar/crear partidos                                         |
| `/api/partido/[id]`                    | GET, PUT, DELETE  | `api/partido/[id]/route.ts`                          | ✅     | CRUD partido + exportar PDF/XLSX (f7a000b)                   |

---

## 3. MODELOS PRISMA

**Schema:** `prisma/schema.prisma` · **DB:** MySQL · **ORM:** Prisma 5.22

### ▲ Zone (nuevo)

| Campo        | Tipo     | Nullable | Default      | Notas                       |
|--------------|----------|----------|--------------|-----------------------------|
| `id`         | Int      | ❌       | autoincrement| PK                          |
| `name`       | String   | ❌       | —            | UNIQUE                      |
| `color`      | String   | ❌       | `#22c55e`    | Hex — para UI               |
| `capacity`   | Int      | ❌       | 0            |                             |
| `is_active`  | Boolean  | ❌       | true         |                             |
| `created_at` | DateTime | ❌       | now()        |                             |
| **Relaciones** | venueZones: VenueZone[] · orders: Order[] | | | |

### Venue ▲ (actualizado)

| Campo            | Tipo      | Nullable | Default      | Notas                           |
|------------------|-----------|----------|--------------|---------------------------------|
| `id`             | Int       | ❌       | autoincrement| PK                              |
| `name`           | String    | ❌       | —            | No @unique — usar findFirst     |
| `type`           | VenueType | ❌       | —            | `matriz · quiosco · cocina`     |
| `capabilities`   | Json      | ❌       | —            | string[] — legacy, ver VenueZone|
| `zona_geografica`| Json      | ✅       | —            | mapa pendiente                  |
| `is_active`      | Boolean   | ❌       | true         |                                 |
| `created_at`     | DateTime  | ❌       | now()        |                                 |
| `updated_at`     | DateTime  | ❌       | updatedAt    |                                 |
| **Relaciones** | users: User[] · venueZones: VenueZone[] · venueUsers: VenueUser[] · venuePaymentMethods: VenuePaymentMethod[] · orders_destino: Order[] | | | |

### ▲ VenueZone (nuevo)

| Campo      | Tipo | Nullable | Notas                              |
|------------|------|----------|------------------------------------|
| `id`       | Int  | ❌       | PK                                 |
| `venue_id` | Int  | ❌       | FK → Venue                         |
| `zone_id`  | Int  | ❌       | FK → Zone                          |
| **Unique** | `[venue_id, zone_id]` | | Evita duplicados              |

### ▲ VenueUser (nuevo)

| Campo      | Tipo | Nullable | Notas                              |
|------------|------|----------|------------------------------------|
| `id`       | Int  | ❌       | PK                                 |
| `venue_id` | Int  | ❌       | FK → Venue                         |
| `user_id`  | Int  | ❌       | FK → User                          |
| **Unique** | `[venue_id, user_id]` | | Evita duplicados             |

### ▲ VenuePaymentMethod (nuevo)

| Campo      | Tipo    | Nullable | Default | Notas                          |
|------------|---------|----------|---------|--------------------------------|
| `id`       | Int     | ❌       | auto    | PK                             |
| `venue_id` | Int     | ❌       | —       | FK → Venue                     |
| `method`   | String  | ❌       | —       | nombre del método              |
| `is_active`| Boolean | ❌       | true    |                                |
| **Unique** | `[venue_id, method]` | | | Evita duplicados          |

### User

| Campo          | Tipo     | Nullable | Default      | Notas                              |
|----------------|----------|----------|--------------|------------------------------------|
| `id`           | Int      | ❌       | autoincrement| PK                                 |
| `code`         | String   | ❌       | —            | UNIQUE · USR-001, ADM-001, etc.    |
| `name`         | String   | ❌       | —            |                                    |
| `lastname`     | String   | ❌       | —            |                                    |
| `pin`          | String   | ❌       | —            | bcrypt hash                        |
| `role`         | Role     | ❌       | —            | mesero/cocina/bar/despacho/validador/admin |
| `cedula`       | String   | ✅       | —            |                                    |
| `telefono`     | String   | ✅       | —            |                                    |
| `venue_id`     | Int      | ✅       | —            | FK → Venue (venue principal)       |
| `is_active`    | Boolean  | ❌       | true         |                                    |
| `access_start` | String   | ✅       | —            | "HH:MM"                            |
| `access_end`   | String   | ✅       | —            | "HH:MM"                            |
| `access_days`  | Json     | ✅       | —            | ["mon","tue","fri"]                |
| `created_at`   | DateTime | ❌       | now()        |                                    |
| `updated_at`   | DateTime | ❌       | updatedAt    |                                    |
| **Relaciones** | venueUsers: VenueUser[] · orders: Order[] · cancellation_logs: CancellationLog[] | | | |

### Product ▲ (actualizado)

| Campo         | Tipo     | Nullable | Default      | Notas                         |
|---------------|----------|----------|--------------|-------------------------------|
| `id`          | Int      | ❌       | autoincrement| PK                            |
| `name`        | String   | ❌       | —            |                               |
| `description` | String   | ✅       | —            |                               |
| `price_usd`   | Decimal  | ❌       | —            | Decimal(10,2)                 |
| `category`    | String   | ❌       | —            | Libre — hamburguesas/raciones/bebidas |
| `badge`       | String   | ✅       | —            | ▲ popular/nuevo/promo/recomendado |
| `is_featured` | Boolean  | ❌       | false        | ▲ destacado en menú           |
| `image_url`   | String   | ✅       | —            | ▲ path local o URL externa    |
| `is_active`   | Boolean  | ❌       | true         |                               |
| `created_at`  | DateTime | ❌       | now()        |                               |
| `updated_at`  | DateTime | ❌       | updatedAt    |                               |
| **Relaciones** | order_items: OrderItem[] · inventory_item: InventoryItem? | | | |

### ▲ InventoryItem (nuevo)

| Campo        | Tipo     | Nullable | Default   | Notas                            |
|--------------|----------|----------|-----------|----------------------------------|
| `id`         | Int      | ❌       | auto      | PK                               |
| `product_id` | Int      | ❌       | —         | UNIQUE · FK → Product (cascade)  |
| `quantity`   | Decimal  | ❌       | 0         | Decimal(10,3)                    |
| `unit`       | String   | ❌       | `unid`    | VarChar(20)                      |
| `min_stock`  | Decimal  | ❌       | 0         | Decimal(10,3) — alerta si qty < min |
| `updated_at` | DateTime | ❌       | updatedAt |                                  |

### Order ▲ (actualizado)

| Campo              | Tipo          | Nullable | Default | Notas                                  |
|--------------------|---------------|----------|---------|----------------------------------------|
| `id`               | Int           | ❌       | auto    | PK                                     |
| `code`             | String        | ❌       | —       | UNIQUE · PUB-00001 o LOC-00001         |
| `origin`           | Origin        | ❌       | —       | PUB · LOC                              |
| `flujo`            | OriginFlujo   | ✅       | —       | A · B                                  |
| `kitchen_status`   | KitchenStatus | ❌       | NUEVO   | NUEVO→PREP→LISTO→ENTREGADO             |
| `payment_status`   | PaymentStatus | ❌       | PEND    | PEND→PAID/CREDIT/CANCELLED             |
| `payment_method`   | String        | ✅       | —       | Pago Móvil, Efectivo, Zelle…           |
| `receipt_photo`    | String        | ✅       | —       | path foto comprobante                  |
| `customer_name`    | String        | ❌       | —       |                                        |
| `customer_lastname`| String        | ❌       | —       |                                        |
| `customer_id`      | String        | ✅       | —       | cédula                                 |
| `zone`             | ZoneCode      | ❌       | —       | Enum legacy: Norte/Sur/VIP/Externa     |
| `zone_id`          | Int           | ✅       | —       | ▲ FK → Zone (relacional nuevo)         |
| `seat`             | String        | ✅       | —       | Fila G Asiento 12                      |
| `total_usd`        | Decimal       | ❌       | —       | Decimal(10,2)                          |
| `rate_used`        | Decimal       | ❌       | —       | Decimal(10,4) · tasa BCV al momento   |
| `total_bs`         | Decimal       | ❌       | —       | Decimal(12,2) · total_usd × rate_used  |
| `venue_assigned`   | Int           | ✅       | —       | legacy                                 |
| `venue_destino_id` | Int           | ✅       | —       | ▲ FK → Venue (routing KDS)            |
| `created_by`       | Int           | ❌       | —       | FK → User                             |
| `note`             | String        | ✅       | —       |                                        |
| `paid_at`          | DateTime      | ✅       | —       |                                        |
| `created_at`       | DateTime      | ❌       | now()   |                                        |
| `updated_at`       | DateTime      | ❌       | updatedAt|                                       |
| **Índices**        | created_by · zone_id · venue_destino_id | | | |

### OrderItem · OrderLog · PaymentValidation · TicketCounter

Sin cambios respecto a v1.2 — ver schema.prisma.

### CancellationLog

| Campo             | Tipo     | Nullable | Notas                                       |
|-------------------|----------|----------|---------------------------------------------|
| `id`              | Int      | ❌       | PK                                          |
| `order_id`        | Int      | ❌       | FK → Order                                  |
| `order_code`      | String   | ❌       | snapshot PUB-XXXXX o LOC-XXXXX              |
| `cancelled_by`    | Int      | ❌       | FK → User (id del admin que anuló)          |
| `reason`          | String   | ❌       | Text — motivo mín 10 chars                  |
| `previous_status` | String   | ❌       | PEND / PAID / CREDIT al momento de anular   |
| `created_at`      | DateTime | ❌       | now()                                       |

### DollarRate · Config · PaymentMethod · Terminal · AnalyticsEvent

Sin cambios respecto a v1.2 — ver schema.prisma.

### Enums

| Enum            | Valores                                              | Notas           |
|-----------------|------------------------------------------------------|-----------------|
| `VenueType`     | `matriz` · `quiosco` · `cocina`                      | `bar` NO existe |
| `Role`          | `mesero` · `cocina` · `bar` · `despacho` · `validador` · `admin` | `atencion` NO existe |
| `Origin`        | `PUB` · `LOC`                                        |                 |
| `OriginFlujo`   | `A` · `B`                                            |                 |
| `KitchenStatus` | `NUEVO` · `PREP` · `LISTO` · `ENTREGADO`             |                 |
| `PaymentStatus` | `PEND` · `PAID` · `CREDIT` · `CANCELLED`             |                 |
| `ZoneCode`      | `Norte` · `Sur` · `VIP` · `Externa`                  | ▲ Renombrado de `Zone` — `General` NO existe en este enum |
| `PayMethodType` | `cash` · `transfer` · `mobile` · `biometric` · `other` |              |
| `TerminalMethod`| `pos_debit` · `pos_credit` · `biopago`               |                 |

> **Nota crítica:** `category` en Product es `String` libre — NO es un enum Prisma.
> **Nota crítica:** El modelo `Zone` (tabla `zones`) acepta cualquier nombre libre. El enum `ZoneCode` (campo `Order.zone`) solo acepta Norte/Sur/VIP/Externa. Para órdenes en zona "General" usar `zone: 'Norte'|'Sur'` + `zone_id → zones.General`.

---

## 4. MIGRACIONES

| Fecha/Hora          | Nombre / Commit                                | Qué cambia                                                              |
|---------------------|------------------------------------------------|-------------------------------------------------------------------------|
| 2026-05-27 18:44:04 | `20260527184404_init`                          | Schema inicial: User, Product, Order, OrderItem, TicketCounter, OrderLog, PaymentValidation, DollarRate, Config |
| 2026-05-28 03:03:18 | `20260528030318_add_venues`                    | Modelo Venue · venue_id en User · venue_assigned en Order               |
| 2026-05-28 05:14:29 | `20260528051429_add_product_image`             | `image_url` en Product                                                  |
| 2026-05-28 07:42:17 | `20260528074217_add_payment_methods_terminals_access` | PaymentMethod · Terminal · access_start/end/days en User        |
| 2026-05-28 07:44:07 | `20260528074407_add_terminals_user_access`     | Índices · cedula/telefono en User                                       |
| 2026-05-28 07:45:47 | `20260528074547_noop`                          | Sin cambios (migration fence)                                           |
| 2026-05-29 23:02:03 | `20260529230203_add_cancellation_log`          | Modelo CancellationLog · FKs                                            |
| 2026-05-30 ~        | ▲ `dfb708d` — add_zones_venue_relations        | ▲ Modelos Zone, VenueZone, VenueUser, VenuePaymentMethod · zone_id + venue_destino_id en Order · badge/is_featured en Product · InventoryItem · AnalyticsEvent |

---

## 5. VALIDACIONES ZOD

Archivo: `src/lib/validations.ts` (Zod 4.x)

| Schema                   | Campos                                              | Reglas clave                                                                 |
|--------------------------|-----------------------------------------------------|------------------------------------------------------------------------------|
| `OriginSchema`           | —                                                   | enum `['PUB', 'LOC']`                                                        |
| `ZoneSchema`             | —                                                   | enum `['Norte', 'Sur', 'VIP', 'Externa']`                                    |
| `CreateOrderItemSchema`  | `product_id`, `qty`, `price_usd`                    | product_id: int positivo · qty: int 1-99 · price_usd: coerce positivo        |
| `CreateOrderSchema`      | `origin`, `customer_name`, `customer_lastname`, `zone`, `items`, `created_by`, `note` | customer_name: trim 1-100 · items: mín 1 · note: max 500 |

**Deuda técnica #3:** `/api/orders/route.ts` tiene copia inline del schema (con `.coerce`). Consolidar en `validations.ts`.

---

## 6. AUTENTICACIÓN Y ROLES

### Flujo JWT

```
POST /api/auth/session
  body: { code, pin }
  → bcrypt.compare(pin, user.pin)
  → SignJWT({ id, code, role }, HS256, 12h)
  → Set-Cookie: cafeball_session (httpOnly, secure prod, sameSite lax)

GET /api/auth/me → jwtVerify(cookie) → { id, code, role }
DELETE /api/auth/session → cookies.delete('cafeball_session')
```

| Parámetro       | Valor                                      |
|-----------------|--------------------------------------------|
| Cookie name     | `cafeball_session`                         |
| Algoritmo       | HS256                                      |
| Duración        | 12 horas                                   |
| Rate limit      | 5 intentos/minuto/IP (Map en memoria)      |
| PIN default     | `1234`                                     |

### Roles

| Rol         | Puede hacer                                                                 |
|-------------|-----------------------------------------------------------------------------|
| `mesero`    | Nueva orden, comandas propias, cobrar                                       |
| `cocina`    | KDS Cocina, bump NUEVO→PREP→LISTO                                           |
| `bar`       | KDS Bar, bump NUEVO→PREP→LISTO                                              |
| `despacho`  | KDS Despacho, asignar mesero, ver todas las órdenes LISTO                   |
| `validador` | Revisar fotos comprobantes, marcar VALIDATED/FLAGGED                        |
| `admin`     | Todo lo anterior + Admin panel + anular órdenes + cerrar turno              |

### Middleware Edge

```
Rutas protegidas: /admin/:path*, /pos/:path*, /kds/:path*
Cookie: cafeball_session → jwtVerify(JWT_SECRET)
Sin token: redirect /login
Token inválido: redirect /login + delete cookie
```

**No implementado en middleware:** verificación de rol por ruta — deuda técnica #2.

---

## 7. DESIGN SYSTEM

### Design Tokens (`src/styles/tokens.css`)

| Variable                  | Valor                         | Uso                              |
|---------------------------|-------------------------------|----------------------------------|
| `--color-primary`         | `#2E7D32`                     | Verde Guaiqueríes                |
| `--color-primary-light`   | `#4CAF50`                     | Verde claro                      |
| `--color-accent`          | `#C62828`                     | Rojo llama — error, anular       |
| `--color-brand`           | `#F5A623`                     | Naranja Café ConBike             |
| `--color-brand-warm`      | `#8B6914`                     | Marrón rueda ConBike             |
| `--color-bg`              | `#0a0a0a`                     | Negro estadio                    |
| `--color-surface`         | `#111411`                     | Negro con toque verde            |
| `--color-surface-2`       | `#1a1f1a`                     | Cards y formularios              |
| `--color-surface-3`       | `#222822`                     | Capas adicionales                |
| `--color-border`          | `rgba(46,125,50,0.25)`        | Bordes verde translúcido         |
| `--color-text`            | `#f0f5f0`                     | Texto principal                  |
| `--color-text-muted`      | `rgba(240,245,240,0.5)`       | Texto secundario                 |
| `--color-nuevo`           | `#F5A623`                     | Naranja — orden NUEVO            |
| `--color-prep`            | `#2E7D32`                     | Verde — PREP                     |
| `--color-listo`           | `#4CAF50`                     | Verde claro — LISTO              |
| `--color-pagado`          | `#4CAF50`                     | Verde — cobrado                  |
| `--color-credito`         | `#7C4DFF`                     | Violeta — fiado                  |
| `--color-pendiente`       | `#F5A623`                     | Naranja — pendiente              |
| `--color-cancelado`       | `#C62828`                     | Rojo — anulado                   |
| `--touch-min`             | `44px`                        | Touch target mínimo              |

---

## 8. MÓDULOS ADMIN — ESTADO

| Módulo                 | Ruta admin             | API endpoints principales                                              | Estado  | Commit   |
|------------------------|------------------------|------------------------------------------------------------------------|---------|----------|
| Mission Control        | `/admin`               | `/api/orders` · `/api/currency` · `/api/turno`                         | ✅      | —        |
| Turno                  | `/admin/turno`         | `/api/turno`                                                           | ✅      | e0e5209  |
| Caja                   | `/admin/caja`          | `/api/caja`                                                            | ✅      | —        |
| Menú / Productos       | `/admin/menu`          | `/api/products/**` · `/api/categories` · `/api/products/import`        | ✅      | c585aa6  |
| Equipo                 | `/admin/equipo`        | `/api/users/**`                                                        | ✅      | —        |
| ▲ Estructura           | `/admin/estructura`    | `/api/venues/**` · `/api/zones/**` · `/api/venues/[id]/zones`          | ✅ ▲    | d48bf83  |
| Config cobros          | `/admin/config`        | `/api/payment-methods/**` · `/api/terminals/**`                        | ✅      | —        |
| Partidos               | `/admin/partido`       | `/api/partido/**`                                                      | ✅      | f7a000b  |
| Partidos detalle       | `/admin/partido/[id]`  | `/api/partido/[id]` · `/api/orders/[id]/cancel`                        | ✅      | 50b1ffc  |
| Perfil negocio         | `/admin/perfil`        | `/api/config/business` · `/api/config/business/logo`                   | ✅      | dbe8080  |
| ▲ Analytics            | `/admin/analytics`     | `/api/analytics/track`                                                 | ✅ ▲    | —        |
| ▲ Inventario           | `/admin/inventario`    | `/api/inventory`                                                       | ✅ ▲    | —        |
| ▲ Marketing / QR       | `/admin/marketing`     | `/api/qr/generate` · `/api/qr/download`                               | ✅ ▲    | 2284819  |
| ▲ Simulator            | `/admin/simulator`     | `/api/simulate/*`                                                      | ✅ ▲    | —        |
| KDS Cocina             | `/kds/cocina`          | `/api/kds` (venue_zones) · `/api/kds/bump`                             | ✅ ▲    | de67232  |
| KDS Bar                | `/kds/bar`             | `/api/kds` (venue_zones) · `/api/kds/bump`                             | ✅ ▲    | de67232  |

### ▲ Admin Estructura — 3 tabs (d48bf83)

| Tab            | Contenido                                           |
|----------------|-----------------------------------------------------|
| **Zonas**      | CRUD zonas del estadio (nombre, color, capacidad)   |
| **Quioscos**   | CRUD venues (tipo, capabilities)                    |
| **Asignaciones**| VenueZone — qué venues sirven qué zonas            |

### Config Business Keys (23 keys)

```
business_name · business_subtitle · business_rif · business_phone
business_address · business_city · business_logo_url
ticket_footer · ticket_show_bs · ticket_show_description · ticket_show_ref
ticket_show_address · ticket_show_phone · ticket_show_client · ticket_show_rif
ticket_show_cashier · ticket_show_rate · ticket_show_payment
ticket_currency_symbol · ticket_prefix · ticket_width_mm
event_name · event_venue
```

---

## 9. FLUJOS OPERATIVOS

### Flujo A — Orden Pública (QR)

```
Cliente escanea QR → /menu (público, sin auth)
  → selecciona productos → carrito ▲ → formulario (nombre, zona, asiento)
  → POST /api/orders { origin: 'PUB', flujo: 'A' }
  → Código PUB-XXXXX → confirmación en pantalla ▲
  → KDS routing automático
  → Despacho → mesero entrega → cobro
```

### Flujo B — Orden por Mesero (LOC)

```
Mesero → /pos/nueva-orden (4 pasos)
  Paso 1: Datos cliente · Paso 2: Zona + asiento
  Paso 3: Catálogo por categoría · Paso 4: Revisión + confirmar
  → POST /api/orders { origin: 'LOC', flujo: 'B', created_by: me.id }
  → Código LOC-XXXXX → redirect /
```

### ▲ KDS Routing — IRROMPIBLE (reescrito con venue_zones)

```
Motor: src/lib/routing.ts — auto-routing engine

hamburguesas / raciones  →  KDS Cocina (/kds/cocina)
bebidas                  →  KDS Bar    (/kds/bar)
orden mixta              →  ambos KDS simultáneo
                         →  KDS Despacho espera bumps de cocina Y bar

Implementación v2.0:
  /api/kds filtra por venue_zones (tabla relacional)
  venue_destino_id en Order se asigna según routing.ts
  capabilities[] en Venue es legacy — ya no es la fuente de verdad
  Fuente de verdad: tabla venue_zones

NUNCA enviar bebida a cocina
```

### Flujo de Pago

```
/pos/cobrar → órdenes PEND o CREDIT
  → modal → COBRAR / FIAR / ANULAR (solo admin)
  → COBRAR: método + referencia + foto → PAID → ticket opcional
  → FIAR: nota → CREDIT
  → ANULAR: motivo ≥ 10 chars → CANCELLED + CancellationLog
```

---

## 10. ▲ MOTOR DE ROUTING (`src/lib/routing.ts`)

Commit: `f95b2da`

```typescript
// Función principal:
// autoRoute(items: OrderItem[], userId: number) → venue_destino_id

// Lógica:
// 1. Determina categorías en los items de la orden
// 2. Consulta venue_zones del usuario logueado para obtener venues disponibles
// 3. Aplica reglas: hamburguesas/raciones → venue tipo cocina
//                  bebidas → venue tipo quiosco/bar
//                  mixta → venue de mayor prioridad (cocina)
// 4. Retorna venue_destino_id para Order.create
```

---

## 11. ▲ SEED DEMO (`prisma/seed-demo.ts`)

Commit: `e9b9113`

```bash
npx tsx prisma/seed-demo.ts
# Requiere: npx tsx prisma/seed.ts ejecutado primero (productos base)
```

| Entidad          | Registros creados                                             |
|------------------|---------------------------------------------------------------|
| Zonas            | 5 — Norte (#ef4444 cap.200), Sur (#3b82f6 cap.200), VIP (#f59e0b cap.100), General (#22c55e cap.200), Externa (#8b5cf6 cap.0) |
| Venues           | 5 — Cocina Central (cocina), Bar Norte (quiosco), Bar Sur (quiosco), Quiosco VIP (quiosco), Matriz (matriz) |
| VenueZones       | 9 — Cocina Central→Norte/Sur/General · Bar Norte→Norte/General · Bar Sur→Sur/General · Quiosco VIP→VIP · Matriz→VIP/Externa |
| Usuarios demo    | 4 — MES-002 (pin:2222), MES-003 (pin:3333), COC-001 (pin:4444), BAR-001 (pin:5555) |
| VenueUsers       | 4 — MES-002→Bar Norte · MES-003→Bar Sur · COC-001→Cocina Central · BAR-001→Bar Norte |
| TicketCounter    | LOC reservado hasta 40                                        |
| Config partidos  | 3 keys — partido_1 (Guaiq. vs Cocodrilos 10/05) · partido_2 (vs Marinos 17/05) · partido_3 (vs Llaneros 30/05 ACTIVO) |
| Órdenes          | 38 — 20 Partido1 (PAID/ENTREGADO) · 15 Partido2 (PAID/ENTREGADO) · 5 Partido3 (PEND/activas hoy) |

---

## 12. DEUDA TÉCNICA

### ✅ Resueltos

| Ítem                                                                                                  | Commit   |
|-------------------------------------------------------------------------------------------------------|----------|
| Admin layout shell unificado (sidebar desktop + bottom nav mobile)                                    | ac092e3  |
| Menú admin CRUD completo: crear/editar/toggle/imagen/xlsx + categorías                                | c585aa6  |
| KDS reescrito con venue_zones reales — capabilities eliminadas como fuente de verdad                  | de67232  |
| Anulación: CancellationLog + /api/orders/[id]/cancel + UI modal                                      | 50b1ffc  |
| Venues reales con capabilities editables desde /admin/estructura                                      | bf1d136  |
| Upload logo desde UI → /api/config/business/logo                                                      | dbe8080  |
| ▲ Modelos Zone/VenueZone/VenueUser/VenuePaymentMethod — schema + migraciones                         | dfb708d  |
| ▲ Auto-routing engine src/lib/routing.ts                                                              | f95b2da  |
| ▲ Admin Estructura — 3 tabs: Zonas + Quioscos + Asignaciones                                         | d48bf83  |
| ▲ Menú público — carrito completo → POST /api/orders → confirmación PUB-XXXXX                        | 3f4a043  |
| ▲ Supabase Realtime — turno activo                                                                    | e0e5209  |
| ▲ Exportar reporte partido PDF + XLSX                                                                 | f7a000b  |
| ▲ Marketing — QR sticker builder (canvas, paleta, texto, PNG/SVG)                                    | 2284819  |
| ▲ Suite de certificación src/lib/certify.ts — 9 módulos, ~37 tests                                   | d228368  |
| ▲ Seed demo — 5 zonas, 5 venues, 9 venue_zones, 38 órdenes, 3 partidos                               | e9b9113  |
| Importar xlsx dev: 4 productos nuevos, 11 ya existían                                                 | —        |

### Crítico

| # | Ítem                                                                | Módulo          |
|---|---------------------------------------------------------------------|-----------------|
| 1 | Supabase Realtime — KDS y POS pendientes (solo turno activo)        | Global Realtime |
| 2 | Middleware no verifica roles por ruta — solo autenticación          | Auth            |
| 3 | Schema Zod duplicado: `validations.ts` vs inline en `orders/route.ts` | Validaciones  |

### Alta prioridad

| # | Ítem                                                                            | Módulo       |
|---|---------------------------------------------------------------------------------|--------------|
| 5 | Importar xlsx en **producción** con `productos-SportBar-Daniel.xlsx`             | Menú         |
| 6 | Logo subido en dev — copiar archivo al VPS `public/logos/`                      | Branding     |
| 7 | Probar comandas personales en producción                                        | POS Comandas |
| 20| `<img>` nativo en `/menu` — migrar a `<Image>` next/image cuando uploads estén en CDN | Menú  |
| 21| `/pedido/[code]` — vista pública del ticket (en construcción)                   | Menu/Orders  |

### ▲ Nueva deuda técnica (30/05/2026)

| # | Ítem                                                                            | Módulo          |
|---|---------------------------------------------------------------------------------|-----------------|
| 22| Tabla `events` — modelo multi-evento (cada partido = un event con config propia)| DB / Schema     |
| 23| PIN temporal por evento — generar PIN efímero para acceso durante partido       | Auth / Eventos  |
| 24| Cierre de caja por venue — cuadre individual por quiosco al cerrar turno        | Caja / Venues   |
| 25| Plantillas de evento — config predefinida (aforo, zonas, menú) reusable        | Admin / Eventos |
| 26| Integración bancaria — webhook pago móvil automático (sin foto manual)          | Pagos           |
| 27| Multi-tenant — arquitectura para múltiples sport bars (backlog estratégico)     | Infraestructura |

### Media prioridad

| # | Ítem                                                      | Módulo        |
|---|-----------------------------------------------------------|---------------|
| 8  | Inventario: abrir lote → asignar venue → cierre → cuadre | Inventario    |
| 9  | KPIs post-partido                                         | Partidos      |
| 10 | Catálogo público /menu — fotos fotógrafo                  | Menú público  |
| 11 | Analytics visitantes por canal (QR/www/local, OS, device) | Analytics     |
| 12 | Ejecutar certify.ts en producción                         | Deploy        |
| 13 | KDS producción — verificar con venues reales configurados | KDS           |

### Backlog

| # | Ítem                                                      |
|---|-----------------------------------------------------------|
| 14 | Score en vivo LPB                                        |
| 15 | E-commerce merchandising                                 |
| 16 | Zonas geográficas estadio (mapa Daniel)                  |
| 17 | Plan B: agente IA                                        |
| 18 | Catálogo offline completo (IndexedDB + Service Worker)   |
| 19 | PWA instalable (next-pwa)                                |

---

## 13. REGLAS CRÍTICAS — NO VIOLAR

### Código

| Regla                                       | Por qué                                           |
|---------------------------------------------|---------------------------------------------------|
| TypeScript estricto — nunca `any`           | Tipado garantiza integridad entre capas            |
| CSS Modules únicamente — nunca Tailwind     | Design tokens propios, coherencia visual           |
| Tokens en `tokens.css` — nunca hardcodeados | Un cambio de marca = un archivo                   |
| Server Components por default               | Performance, SEO                                  |
| Prisma: eager loading — cero N+1            | MySQL en VPS limitado                             |
| Lógica de negocio en API routes             | Reutilizable, testeable, seguro                   |
| Early return — nesting máximo 2 niveles     | Legibilidad                                       |

### Moneda — IRROMPIBLE

| Regla                        | Valor                                      |
|------------------------------|--------------------------------------------|
| Precios internos             | USD (Decimal en DB)                        |
| Símbolo divisas              | `REF` (nunca `$` en UI)                   |
| Símbolo bolívares            | `Bs.`                                      |
| Conversión                   | `price_usd × getCurrentRate() = total_bs` |
| Tasa                         | `DollarRate` · fallback 50.0              |
| NUNCA bloquear operación     | Por falta de tasa → usar fallback          |

### Deploy

```bash
# Flujo siempre:
git push origin main
ssh root@187.124.241.213
cd /var/www/sportbar
git pull && npx prisma generate && npx prisma migrate deploy && npm run build && pm2 restart sportbar

# NUNCA tocar: C:\laragon\www\synticorex (SOLO LECTURA)
```

### KDS — IRROMPIBLE

```
hamburguesas/raciones → cocina ÚNICAMENTE
bebidas               → bar ÚNICAMENTE
NUNCA mezclar routing
Orden mixta → ambos KDS, despacho espera los dos bumps
Fuente de verdad: tabla venue_zones (NO capabilities[])
```

---

*SYSTEM_MAP.md — SportBar v2.0 — Actualizado 30/05/2026 — commit d48bf83*
*▲ Actualizar en cada sesión que modifique rutas, modelos, migraciones o reglas críticas*
