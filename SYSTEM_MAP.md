# SYSTEM_MAP — SportBar POS
# ▲ Actualizar este archivo en cada sesión con cambios estructurales
**Generado:** 29/05/2026 | **Commit base:** `ac092e3` | **Versión:** 0.1.0

---

## 1. HEADER — ENTORNO

| Campo            | Valor                                                    |
|------------------|----------------------------------------------------------|
| **URL prod**     | https://tusport.bar                                      |
| **VPS**          | 187.124.241.213 — PM2 proceso `sportbar`, puerto 3002    |
| **DB**           | MySQL · `sportbar` @ 127.0.0.1:3306                      |
| **Repo**         | https://github.com/syntidev/sportbar                    |
| **Local**        | C:\laragon\www\sportbar                                  |
| **Commit actual**| `ac092e3` — feat(admin): unified shell                   |
| **Versión**      | 0.1.0 (package.json)                                     |
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
| Realtime       | @supabase/supabase-js 2.x — **pendiente configurar**                    |
| PWA            | sharp · service worker (pendiente next-pwa)                             |
| Deploy         | PM2 + Nginx + Cloudflare + SSL                                          |
| Otros          | xlsx (importación productos) · zod 4.x (validaciones)                  |

---

## 2. ÁRBOL DE RUTAS COMPLETO

### 2a. Rutas UI (page.tsx)

| Ruta UI                    | Archivo                                    | Protegida | Roles            | Estado  |
|----------------------------|--------------------------------------------|-----------|------------------|---------|
| `/`                        | `src/app/page.tsx`                         | ✅ Sí     | Todos            | ✅      |
| `/login`                   | `src/app/login/page.tsx`                   | ❌ No     | —                | ✅      |
| `/menu`                    | `src/app/menu/page.tsx`                    | ❌ No     | Público (QR)     | ✅      |
| `/pos/nueva-orden`         | `src/app/pos/nueva-orden/page.tsx`         | ✅ Sí     | mesero, admin    | ✅      |
| `/pos/cobrar`              | `src/app/pos/cobrar/page.tsx`              | ✅ Sí     | mesero, admin    | ✅      |
| `/pos/comandas`            | `src/app/pos/comandas/page.tsx`            | ✅ Sí     | mesero, admin    | ✅      |
| `/kds/cocina`              | `src/app/kds/cocina/page.tsx`              | ✅ Sí     | cocina, admin    | ✅      |
| `/kds/bar`                 | `src/app/kds/bar/page.tsx`                 | ✅ Sí     | bar, admin       | ✅      |
| `/kds/despacho`            | `src/app/kds/despacho/page.tsx`            | ✅ Sí     | despacho, admin  | ✅      |
| `/admin`                   | `src/app/admin/page.tsx`                   | ✅ Sí     | admin            | ✅      |
| `/admin/turno`             | `src/app/admin/turno/page.tsx`             | ✅ Sí     | admin            | ✅      |
| `/admin/caja`              | `src/app/admin/caja/page.tsx`              | ✅ Sí     | admin            | ✅      |
| `/admin/menu`              | `src/app/admin/menu/page.tsx`              | ✅ Sí     | admin            | ✅      |
| `/admin/equipo`            | `src/app/admin/equipo/page.tsx`            | ✅ Sí     | admin            | ✅      |
| `/admin/estructura`        | `src/app/admin/estructura/page.tsx`        | ✅ Sí     | admin            | ✅      |
| `/admin/config`            | `src/app/admin/config/page.tsx`            | ✅ Sí     | admin            | ✅      |
| `/admin/partido`           | `src/app/admin/partido/page.tsx`           | ✅ Sí     | admin            | ✅      |
| `/admin/partido/[id]`      | `src/app/admin/partido/[id]/page.tsx`      | ✅ Sí     | admin            | ✅      |
| `/admin/perfil`            | `src/app/admin/perfil/page.tsx`            | ✅ Sí     | admin            | ✅      |

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
| `/api/kds/bump`                        | POST              | `api/kds/bump/route.ts`                              | ✅     | Bump de estación KDS (NUEVO→PREP→LISTO→ENTREGADO)             |
| `/api/products`                        | GET, POST         | `api/products/route.ts`                              | ✅     | Catálogo activo · Crear producto                              |
| `/api/products/[id]`                   | GET, PUT, DELETE  | `api/products/[id]/route.ts`                         | ✅     | CRUD producto individual                                      |
| `/api/products/[id]/upload`            | POST              | `api/products/[id]/upload/route.ts`                  | ✅     | Subir foto producto                                           |
| `/api/products/import`                 | POST              | `api/products/import/route.ts`                       | ✅     | Importar xlsx de productos                                    |
| `/api/users`                           | GET, POST         | `api/users/route.ts`                                 | ✅     | Listar/crear usuarios                                         |
| `/api/users/[id]`                      | GET, PUT, DELETE  | `api/users/[id]/route.ts`                            | ✅     | CRUD usuario individual                                       |
| `/api/venues`                          | GET, POST         | `api/venues/route.ts`                                | ✅     | Listar/crear venues                                           |
| `/api/venues/[id]`                     | GET, PUT, DELETE  | `api/venues/[id]/route.ts`                           | ✅     | CRUD venue individual                                         |
| `/api/currency`                        | GET               | `api/currency/route.ts`                              | ❌     | Tasa BCV activa · fallback 50.0 Bs./USD                       |
| `/api/currency/manual`                 | POST              | `api/currency/manual/route.ts`                       | ✅     | Registrar tasa manual                                         |
| `/api/config`                          | GET, PATCH        | `api/config/route.ts`                                | ✅     | Config genérica key/value                                     |
| `/api/config/business`                 | GET, PATCH        | `api/config/business/route.ts`                       | ✅     | 23 keys de perfil del negocio y ticket                        |
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
| `/api/partido/[id]`                    | GET, PUT, DELETE  | `api/partido/[id]/route.ts`                          | ✅     | CRUD partido individual                                       |

---

## 3. MODELOS PRISMA

**Schema:** `prisma/schema.prisma` · **DB:** MySQL · **ORM:** Prisma 5.22

### Venue

| Campo            | Tipo      | Nullable | Default      | Notas                       |
|------------------|-----------|----------|--------------|-----------------------------|
| `id`             | Int       | ❌       | autoincrement| PK                          |
| `name`           | String    | ❌       | —            |                             |
| `type`           | VenueType | ❌       | —            | matriz · quiosco · cocina   |
| `capabilities`   | Json      | ❌       | —            | string[] de capacidades     |
| `zona_geografica`| Json      | ✅       | —            | mapa Daniel pendiente       |
| `is_active`      | Boolean   | ❌       | true         |                             |
| `created_at`     | DateTime  | ❌       | now()        |                             |
| `updated_at`     | DateTime  | ❌       | updatedAt    |                             |
| **Relaciones**   | users: User[] |      |              |                             |

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
| `venue_id`     | Int      | ✅       | —            | FK → Venue                         |
| `is_active`    | Boolean  | ❌       | true         |                                    |
| `access_start` | String   | ✅       | —            | "HH:MM"                            |
| `access_end`   | String   | ✅       | —            | "HH:MM"                            |
| `access_days`  | Json     | ✅       | —            | ["mon","tue","fri"]                |
| `created_at`   | DateTime | ❌       | now()        |                                    |
| `updated_at`   | DateTime | ❌       | updatedAt    |                                    |
| **Índice**     | venue_id |          |              |                                    |

### Product

| Campo         | Tipo     | Nullable | Default      | Notas                         |
|---------------|----------|----------|--------------|-------------------------------|
| `id`          | Int      | ❌       | autoincrement| PK                            |
| `name`        | String   | ❌       | —            |                               |
| `description` | String   | ✅       | —            |                               |
| `price_usd`   | Decimal  | ❌       | —            | Decimal(10,2)                 |
| `category`    | Category | ❌       | —            | hamburguesas/raciones/bebidas |
| `image_url`   | String   | ✅       | —            |                               |
| `is_active`   | Boolean  | ❌       | true         |                               |
| `created_at`  | DateTime | ❌       | now()        |                               |
| `updated_at`  | DateTime | ❌       | updatedAt    |                               |

### Order

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
| `zone`             | Zone          | ❌       | —       | Norte/Sur/VIP/Externa                  |
| `seat`             | String        | ✅       | —       | Fila G Asiento 12                      |
| `total_usd`        | Decimal       | ❌       | —       | Decimal(10,2)                          |
| `rate_used`        | Decimal       | ❌       | —       | Decimal(10,4) · tasa BCV al momento   |
| `total_bs`         | Decimal       | ❌       | —       | Decimal(12,2) · total_usd × rate_used  |
| `venue_assigned`   | Int           | ✅       | —       | venue destino de la orden              |
| `created_by`       | Int           | ❌       | —       | FK → User                             |
| `note`             | String        | ✅       | —       |                                        |
| `paid_at`          | DateTime      | ✅       | —       |                                        |
| `created_at`       | DateTime      | ❌       | now()   |                                        |
| `updated_at`       | DateTime      | ❌       | updatedAt|                                       |
| **Índice**         | created_by    |          |         |                                        |

### OrderItem

| Campo        | Tipo    | Nullable | Notas                              |
|--------------|---------|----------|------------------------------------|
| `id`         | Int     | ❌       | PK                                 |
| `order_id`   | Int     | ❌       | FK → Order                         |
| `product_id` | Int     | ❌       | FK → Product                       |
| `qty`        | Int     | ❌       |                                    |
| `price_usd`  | Decimal | ❌       | Decimal(10,2) · snapshot al momento|
| `subtotal`   | Decimal | ❌       | Decimal(10,2) · price_usd × qty   |

### TicketCounter

| Campo    | Tipo   | Nullable | Notas                 |
|----------|--------|----------|-----------------------|
| `id`     | Int    | ❌       | PK                    |
| `prefix` | String | ❌       | UNIQUE · PUB o LOC    |
| `last`   | Int    | ❌       | Default 0             |

### OrderLog

| Campo        | Tipo     | Nullable | Notas                                       |
|--------------|----------|----------|---------------------------------------------|
| `id`         | Int      | ❌       | PK                                          |
| `order_id`   | Int      | ❌       | FK → Order                                  |
| `action`     | String   | ❌       | CREATED · KITCHEN_STATUS_CHANGE · PAYMENT_STATUS_CHANGE |
| `from_state` | String   | ✅       |                                             |
| `to_state`   | String   | ✅       |                                             |
| `actor_code` | String   | ❌       | USR-001, VAL-001, PUB                       |
| `note`       | String   | ✅       |                                             |
| `created_at` | DateTime | ❌       | now()                                       |

### PaymentValidation

| Campo          | Tipo     | Nullable | Notas                           |
|----------------|----------|----------|---------------------------------|
| `id`           | Int      | ❌       | PK                              |
| `order_id`     | Int      | ❌       | UNIQUE · FK → Order             |
| `photo_path`   | String   | ✅       |                                 |
| `validated_by` | String   | ✅       | code del validador              |
| `status`       | String   | ❌       | PENDING/VALIDATED/FLAGGED       |
| `note`         | String   | ✅       |                                 |
| `validated_at` | DateTime | ✅       |                                 |
| `created_at`   | DateTime | ❌       | now()                           |

### DollarRate

| Campo             | Tipo     | Nullable | Notas                        |
|-------------------|----------|----------|------------------------------|
| `id`              | Int      | ❌       | PK                           |
| `rate`            | Decimal  | ❌       | Decimal(12,4)                |
| `source`          | String   | ❌       | "BCV", "manual", "fallback"  |
| `is_active`       | Boolean  | ❌       | true                         |
| `effective_from`  | DateTime | ❌       | now()                        |
| `effective_until` | DateTime | ✅       |                              |
| `created_at`      | DateTime | ❌       | now()                        |

### Config

| Campo   | Tipo   | Nullable | Notas                 |
|---------|--------|----------|-----------------------|
| `id`    | Int    | ❌       | PK                    |
| `key`   | String | ❌       | UNIQUE                |
| `value` | String | ❌       | Text — cualquier valor|

### PaymentMethod

| Campo        | Tipo          | Nullable | Default | Notas                              |
|--------------|---------------|----------|---------|------------------------------------|
| `id`         | Int           | ❌       | auto    | PK                                 |
| `name`       | String        | ❌       | —       | VarChar(80)                        |
| `type`       | PayMethodType | ❌       | —       | cash/transfer/mobile/biometric/other|
| `bank_name`  | String        | ✅       | —       | VarChar(100)                       |
| `is_active`  | Boolean       | ❌       | true    |                                    |
| `sort_order` | Int           | ❌       | 0       |                                    |
| `created_at` | DateTime      | ❌       | now()   |                                    |
| `updated_at` | DateTime      | ❌       | updatedAt|                                   |

### Terminal

| Campo               | Tipo           | Nullable | Notas                          |
|---------------------|----------------|----------|--------------------------------|
| `id`                | Int            | ❌       | PK                             |
| `method`            | TerminalMethod | ❌       | pos_debit/pos_credit/biopago   |
| `bank_name`         | String         | ❌       | VarChar(100)                   |
| `serial`            | String         | ✅       | VarChar(50)                    |
| `commercial_number` | String         | ✅       | VarChar(50)                    |
| `is_active`         | Boolean        | ❌       | true                           |
| `created_at`        | DateTime       | ❌       | now()                          |
| `updated_at`        | DateTime       | ❌       | updatedAt                      |

### Enums

| Enum            | Valores                                              |
|-----------------|------------------------------------------------------|
| `VenueType`     | `matriz` · `quiosco` · `cocina`                      |
| `Role`          | `mesero` · `cocina` · `bar` · `despacho` · `validador` · `admin` |
| `Category`      | `hamburguesas` · `raciones` · `bebidas`              |
| `Origin`        | `PUB` · `LOC`                                        |
| `OriginFlujo`   | `A` · `B`                                            |
| `KitchenStatus` | `NUEVO` · `PREP` · `LISTO` · `ENTREGADO`             |
| `PaymentStatus` | `PEND` · `PAID` · `CREDIT` · `CANCELLED`             |
| `Zone`          | `Norte` · `Sur` · `VIP` · `Externa`                  |
| `PayMethodType` | `cash` · `transfer` · `mobile` · `biometric` · `other` |
| `TerminalMethod`| `pos_debit` · `pos_credit` · `biopago`               |

---

## 4. MIGRACIONES

| Fecha/Hora          | Nombre                                        | Qué cambia                                                              |
|---------------------|-----------------------------------------------|-------------------------------------------------------------------------|
| 2026-05-27 18:44:04 | `20260527184404_init`                         | Schema inicial: User, Product, Order, OrderItem, TicketCounter, OrderLog, PaymentValidation, DollarRate, Config |
| 2026-05-28 03:03:18 | `20260528030318_add_venues`                   | Añade modelo Venue · campo venue_id en User · campo venue_assigned en Order |
| 2026-05-28 05:14:29 | `20260528051429_add_product_image`            | Campo `image_url` en Product                                            |
| 2026-05-28 07:42:17 | `20260528074217_add_payment_methods_terminals_access` | Modelos PaymentMethod y Terminal · campos de acceso en User (access_start/end/days) |
| 2026-05-28 07:44:07 | `20260528074407_add_terminals_user_access`    | Ajuste índices y campos cedula/telefono en User                         |
| 2026-05-28 07:45:47 | `20260528074547_noop`                         | Sin cambios (migration fence)                                           |

---

## 5. VALIDACIONES ZOD

Archivo: `src/lib/validations.ts` (Zod 4.x)

| Schema                   | Campos                                              | Reglas clave                                                                 |
|--------------------------|-----------------------------------------------------|------------------------------------------------------------------------------|
| `OriginSchema`           | —                                                   | enum `['PUB', 'LOC']`                                                        |
| `ZoneSchema`             | —                                                   | enum `['Norte', 'Sur', 'VIP', 'Externa']`                                    |
| `CategorySchema`         | —                                                   | enum `['hamburguesas', 'raciones', 'bebidas']`                               |
| `CreateOrderItemSchema`  | `product_id`, `qty`, `price_usd`                    | product_id: int positivo · qty: int 1-99 · price_usd: **coerce** number positivo |
| `CreateOrderSchema`      | `origin`, `customer_name`, `customer_lastname`, `customer_id`, `zone`, `seat`, `items`, `created_by`, `note` | customer_name/lastname: trim, 1-100 chars · customer_id: regex `/^[VEve]?\d{6,8}$/` opcional · items: mín 1 · created_by: int positivo · note: max 500 |

**Nota:** El route `/api/orders/route.ts` tiene su propia copia inline del schema (con `.coerce` añadido en esta sesión). Consolidar en `validations.ts` es deuda técnica pendiente.

El route `/api/auth/session/route.ts` define su propio `LoginSchema` inline:
- `code`: string min 1
- `pin`: regex `/^\d{4}$/` (exactamente 4 dígitos)

El route `/api/config/business/route.ts` define `PatchSchema`:
- `z.record(z.string(), z.string())` filtrado contra `BUSINESS_KEYS` (23 keys)

---

## 6. AUTENTICACIÓN Y ROLES

### Flujo JWT

```
POST /api/auth/session
  body: { code, pin }
  → bcrypt.compare(pin, user.pin)
  → SignJWT({ id, code, role }, HS256, 12h)
  → Set-Cookie: cafeball_session (httpOnly, secure prod, sameSite lax)

GET /api/auth/me
  → jwtVerify(cookie, JWT_SECRET)
  → { id, code, role }

DELETE /api/auth/session
  → cookies.delete('cafeball_session')
```

| Parámetro       | Valor                                      |
|-----------------|--------------------------------------------|
| Cookie name     | `cafeball_session`                         |
| Algoritmo       | HS256                                      |
| Duración        | 12 horas                                   |
| Payload         | `{ id, code, role }`                       |
| Rate limit      | 5 intentos/minuto/IP (Map en memoria)      |
| PIN default     | `1234` (bcrypt hash en seed)               |
| Throttle login  | 429 después de 5 intentos por minuto por IP|

### Roles

| Rol         | Puede hacer                                                                 |
|-------------|-----------------------------------------------------------------------------|
| `mesero`    | Nueva orden, comandas propias, cobrar                                       |
| `cocina`    | KDS Cocina, bump NUEVO→PREP→LISTO                                           |
| `bar`       | KDS Bar, bump NUEVO→PREP→LISTO                                              |
| `despacho`  | KDS Despacho, asignar mesero, ver todas las órdenes LISTO                   |
| `validador` | Revisar fotos comprobantes, marcar VALIDATED/FLAGGED                        |
| `admin`     | Todo lo anterior + Admin panel completo + anular órdenes + cerrar turno     |

### Middleware Edge

Archivo: `src/middleware.ts`

```
Rutas protegidas: /admin/:path*, /pos/:path*, /kds/:path*
Cookie: cafeball_session → jwtVerify(JWT_SECRET)
Sin token: redirect /login
Token inválido: redirect /login + delete cookie
Matcher: solo rutas protegidas (Edge Runtime)
```

**No implementado en middleware:** verificación de rol por ruta (solo verifica autenticación, no autorización). El control de roles es responsabilidad de cada page/API.

---

## 7. DESIGN SYSTEM

### Design Tokens (`src/styles/tokens.css`)

| Variable                  | Valor                         | Uso                              |
|---------------------------|-------------------------------|----------------------------------|
| `--color-primary`         | `#2E7D32`                     | Verde Guaiqueríes — acción principal |
| `--color-primary-light`   | `#4CAF50`                     | Verde claro — texto sobre oscuro |
| `--color-accent`          | `#C62828`                     | Rojo llama — error, anular       |
| `--color-brand`           | `#F5A623`                     | Naranja Café ConBike             |
| `--color-brand-warm`      | `#8B6914`                     | Marrón rueda ConBike             |
| `--color-bg`              | `#0a0a0a`                     | Negro estadio — fondo página     |
| `--color-surface`         | `#111411`                     | Negro con toque verde — panels   |
| `--color-surface-2`       | `#1a1f1a`                     | Cards y formularios              |
| `--color-surface-3`       | `#222822`                     | Capas adicionales                |
| `--color-border`          | `rgba(46,125,50,0.25)`        | Bordes verde translúcido         |
| `--color-border-strong`   | `rgba(46,125,50,0.5)`         | Bordes más visibles              |
| `--color-text`            | `#f0f5f0`                     | Texto principal                  |
| `--color-text-muted`      | `rgba(240,245,240,0.5)`       | Texto secundario                 |
| `--color-text-subtle`     | `rgba(240,245,240,0.3)`       | Texto terciario                  |
| `--color-nuevo`           | `#F5A623`                     | Naranja — orden NUEVO            |
| `--color-prep`            | `#2E7D32`                     | Verde — en PREP                  |
| `--color-listo`           | `#4CAF50`                     | Verde claro — LISTO para entregar|
| `--color-entregado`       | `rgba(240,245,240,0.2)`       | Gris suave — ENTREGADO           |
| `--color-pagado`          | `#4CAF50`                     | Verde — cobrado                  |
| `--color-credito`         | `#7C4DFF`                     | Violeta — fiado                  |
| `--color-pendiente`       | `#F5A623`                     | Naranja — pendiente              |
| `--color-cancelado`       | `#C62828`                     | Rojo — anulado                   |
| `--font-sans`             | `'Inter', system-ui, sans-serif` |                               |
| `--space-{1-10}`          | 4·8·12·16·20·24·32·40 px      | Escala de espaciado              |
| `--radius-sm/md/lg/xl`    | 8·12·16·20 px                 |                                  |
| `--radius-full`           | 9999px                        | Pills                            |
| `--shadow-sm/md/lg`       | rgba(0,0,0,0.4/0.5/0.6)       |                                  |
| `--shadow-glow`           | `0 0 20px rgba(46,125,50,0.3)`| Glow verde                       |
| `--touch-min`             | `44px`                        | Touch target mínimo              |
| `--transition-fast/base/slow` | 150·250·350ms ease        |                                  |

### Breakpoints

| Breakpoint | Valor  | Uso                                              |
|------------|--------|--------------------------------------------------|
| Mobile     | < 480px| fieldRow single column en forms                  |
| Tablet     | < 700px| Comandas KDS: 3col→1col                          |
| Desktop    | < 768px| Admin layout: sidebar 220px visible, bottom nav oculto |

### Componentes reutilizables

| Componente              | Archivo                             | Descripción                                      |
|-------------------------|-------------------------------------|--------------------------------------------------|
| `TicketPrint`           | `src/components/ui/TicketPrint.tsx` | `<a target="_blank">` al ticket HTML · solo PAID |
| `CourtBackground`       | `src/components/ui/CourtBackground.tsx` | Fondo decorativo cancha                      |
| `ProductCard`           | `src/components/ProductCard.tsx`    | Card de producto en catálogo público             |

---

## 8. MÓDULOS ADMIN — ESTADO

| Módulo               | Ruta admin           | API endpoints principales                              | CRUD | Estado |
|----------------------|----------------------|--------------------------------------------------------|------|--------|
| Mission Control      | `/admin`             | `/api/orders`, `/api/currency`, `/api/turno`           | —    | ✅     |
| Turno                | `/admin/turno`       | `/api/turno`                                           | R·C  | ✅     |
| Caja                 | `/admin/caja`        | `/api/caja`                                            | R    | ✅     |
| Menú / Productos     | `/admin/menu`        | `/api/products`, `/api/products/[id]`, `/api/products/[id]/upload`, `/api/products/import` | CRUD+foto+xlsx | ✅ |
| Equipo               | `/admin/equipo`      | `/api/users`, `/api/users/[id]`                        | CRUD | ✅     |
| Estructura / Venues  | `/admin/estructura`  | `/api/venues`, `/api/venues/[id]`                      | CRUD | ✅     |
| Config cobros        | `/admin/config`      | `/api/payment-methods/**`, `/api/terminals/**`, `/api/config/payment-data` | CRUD | ✅ |
| Partidos             | `/admin/partido`     | `/api/partido`, `/api/partido/[id]`                    | CRUD | ✅     |
| Perfil negocio       | `/admin/perfil`      | `/api/config/business`                                 | R·U  | ✅     |
| Admin layout shell   | `src/app/admin/layout.tsx` | /api/config/business + /api/auth/me + /api/currency | — | ✅ |
| Módulo inventario    | —                    | —                                                      | —    | ❌     |
| KPIs post-partido    | —                    | —                                                      | —    | ❌     |
| Analytics visitantes | —                    | —                                                      | —    | ❌     |
| Score en vivo LPB    | —                    | —                                                      | —    | ❌     |

### Config Business Keys (23 keys en `src/lib/business-config.ts`)

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
  → selecciona productos → completa formulario (nombre, zona, asiento)
  → POST /api/orders { origin: 'PUB', flujo: 'A', created_by: sysUser.id }
  → Código generado: PUB-XXXXX (TicketCounter prefix='PUB')
  → kitchen_status: NUEVO · payment_status: PEND
  → KDS routing automático (ver abajo)
  → Despacho ve orden en KDS → asigna mesero → mesero entrega
  → Mesero registra cobro en /pos/cobrar
```

### Flujo B — Orden por Mesero (LOC)

```
Mesero autenticado → /pos/nueva-orden (4 pasos)
  Paso 1: Datos cliente (nombre, apellido, cédula opcional)
  Paso 2: Zona + asiento
  Paso 3: Selección de productos (catálogo por categoría)
  Paso 4: Revisión + confirmar
  → POST /api/orders { origin: 'LOC', flujo: 'B', created_by: me.id }
  → Código generado: LOC-XXXXX (TicketCounter prefix='LOC')
  → Redirect a / tras éxito
  → Mesero sigue en /pos/comandas sus órdenes personales
```

### KDS Routing — IRROMPIBLE

```
hamburguesas / raciones  →  KDS Cocina (/kds/cocina)
bebidas                  →  KDS Bar    (/kds/bar)
orden mixta              →  ambos KDS simultáneo
                         →  KDS Despacho espera bumps de cocina Y bar
NUNCA enviar bebida a cocina
```

### Flujo de Pago

```
/pos/cobrar → lista órdenes payment_status: PEND o CREDIT
  → Seleccionar orden → modal
  → Modo COBRAR: elegir método (6 dinámicos) + referencia + foto
    → PATCH /api/orders/[id]/status { payment_status: 'PAID', payment_method, ... }
    → Post-pago: mensaje éxito + código · botones [Imprimir ticket] [Siguiente en 5...]
    → Auto-redirect a / en 5 segundos
    → "Imprimir ticket": <a href="/api/orders/[id]/ticket" target="_blank">
       → HTML térmico con window.addEventListener('load', () => window.print())
  → Modo FIAR: nota obligatoria → CREDIT
  → Modo ANULAR (solo admin): motivo ≥ 10 chars → CANCELLED
```

### Ticket Térmico

```
GET /api/orders/[id]/ticket
  → HTML auto-contenido con CSS @page { size: {58|80}mm auto }
  → Auto-print: window.addEventListener('load', () => window.print())
  → Secciones condicionales según config keys ticket_show_*
  → Símbolo configurable: REF | $ | Bs.
  → Botón manual "Imprimir ticket" como fallback (no-print class)
```

---

## 10. DEUDA TÉCNICA REGISTRADA

### Crítico (bloquea funcionalidad)

| # | Ítem                                                      | Módulo        |
|---|-----------------------------------------------------------|---------------|
| 1 | Supabase Realtime no configurado (URL + ANON_KEY en .env VPS) | Global    |
| 2 | Middleware no verifica roles por ruta (solo autenticación) | Auth         |
| 3 | Schema Zod duplicado: `validations.ts` vs inline en `orders/route.ts` | Validaciones |

### Alta prioridad

| # | Ítem                                                      | Módulo        |
|---|-----------------------------------------------------------|---------------|
| 4 | Venues reales de Daniel no creados en producción          | Estructura    |
| 5 | Probar comandas personales en producción (último deploy)  | POS Comandas  |
| 6 | Logos nuevos no subidos al VPS `public/`                  | Branding      |
| 7 | Importar productos xlsx en producción (15 productos en dev)| Menú         |

### Media prioridad

| # | Ítem                                                      | Módulo        |
|---|-----------------------------------------------------------|---------------|
| 8  | Módulo inventario/lotes (abrir → asignar venue → cierre → cuadre) | Nuevo |
| 9  | KPIs post-partido                                         | Partidos      |
| 10 | Catálogo público /menu pulido (fotos fotógrafo)           | Menú público  |
| 11 | Analytics visitantes por canal (QR/www/local, OS, device) | Nuevo        |
| 12 | Script certify.ts en producción                           | Deploy        |

### Backlog

| # | Ítem                                                      |
|---|-----------------------------------------------------------|
| 13 | Score en vivo LPB                                        |
| 14 | E-commerce merchandising                                 |
| 15 | Zonas geográficas estadio (mapa Daniel pendiente)        |
| 16 | Plan B: agente IA                                        |
| 17 | Catálogo offline completo (IndexedDB + Service Worker)   |
| 18 | PWA instalable (next-pwa)                                |

---

## 11. REGLAS CRÍTICAS — NO VIOLAR

### Código

| Regla                                       | Por qué                                           |
|---------------------------------------------|---------------------------------------------------|
| TypeScript estricto en TODO archivo — nunca `any` | Tipado garantiza integridad entre capas      |
| CSS Modules únicamente — nunca Tailwind     | Design tokens propios, coherencia visual           |
| Tokens en `tokens.css` — nunca colores hardcodeados | Un cambio de marca = un archivo           |
| Server Components por default — Client solo con estado/eventos | Performance, SEO              |
| Prisma: eager loading — cero N+1            | MySQL en VPS limitado, latencia real               |
| Lógica de negocio en API routes — nunca en componentes | Reutilizable, testeable, seguro       |
| Early return obligatorio — nesting máximo 2 niveles | Legibilidad, mantenibilidad              |

### Moneda — IRROMPIBLE

| Regla                              | Valor                               |
|------------------------------------|-------------------------------------|
| Precios internos                   | USD (Decimal en DB)                 |
| Símbolo divisas                    | `REF` (nunca `$` en UI)            |
| Símbolo bolívares                  | `Bs.`                               |
| Conversión                         | `price_usd × getCurrentRate() = total_bs` |
| Tasa                               | `DollarRate` · fallback 50.0       |
| NUNCA bloquear operación           | Por falta de tasa → usar fallback   |

### UX — IRROMPIBLE

| Regla                                     | Valor          |
|-------------------------------------------|----------------|
| Touch target mínimo acciones críticas     | 56px height    |
| Touch target mínimo general               | 44px (`--touch-min`) |
| Acciones críticas visibles sin scroll     | Siempre        |
| Íconos                                    | Lucide React ÚNICAMENTE — nunca emojis en UI |

### Deploy

```bash
# Flujo siempre:
git push origin main  (local)
ssh root@187.124.241.213
cd /var/www/sportbar
git pull
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart sportbar

# NUNCA tocar: C:\laragon\www\synticorex (repo referencia SOLO LECTURA)
```

### KDS — IRROMPIBLE

```
hamburguesas/raciones → cocina ÚNICAMENTE
bebidas → bar ÚNICAMENTE
NUNCA mezclar routing
Orden mixta → ambos KDS, despacho espera los dos bumps
```

---

*SYSTEM_MAP.md — SportBar v1.0 — Generado 29/05/2026 — commit ac092e3*
*▲ Actualizar en cada sesión que modifique rutas, modelos, migraciones o reglas críticas*
