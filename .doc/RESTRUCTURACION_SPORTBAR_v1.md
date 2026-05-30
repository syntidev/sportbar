# RESTRUCTURACIÓN SPORTBAR — ROADMAP SPRINT FINAL
**Fecha:** 30/05/2026 | **Versión:** 1.0 | **Autor:** Carlos + Claude (Arquitecto)  
**Sistema:** tusport.bar | VPS: 187.124.241.213 | Repo: syntidev/sportbar

---

## 1. DIAGNÓSTICO

El sistema fue construido de adentro hacia afuera — primero el código, luego el modelo de negocio. Esto generó:

- Conceptos redundantes: Zona y Venue mezclados
- Capabilities hardcodeadas como array de strings
- KDS routing en config JSON en lugar de tabla relacional
- Zonas hardcodeadas (Norte/Sur/VIP) en lugar de CRUD dinámico
- Usuarios sin quiosco asignado formalmente
- Sin módulo de inventario
- Sin simulador de carga para stress test

---

## 2. MODELO MENTAL CORRECTO — 3 CAPAS

```
CAPA 1 — EL ESTADIO (configuración, no cambia en el día)
  Zonas de afluencia: Norte, Sur, VIP, General, Externa
  → Dónde están sentados los clientes
  → CRUD dinámico desde /admin/estructura

CAPA 2 — PUNTOS DE SERVICIO / QUIOSCOS
  Cocina Central, Bar Norte, Bar Sur, Quiosco VIP, Matriz
  → Dónde opera el personal de Daniel
  → Cada quiosco atiende N zonas
  → Cada quiosco tiene usuarios y métodos de pago propios

CAPA 3 — EL TURNO / PARTIDO
  Duración: 90 min + entretiempo
  Órdenes: PUB (cliente QR) + LOC (mesero)
  Flujo: Zona cliente → Quiosco asignado → KDS → Despacho
```

### Entidades distintas — NO confundir

| Entidad | Definición | Ejemplo |
|---------|-----------|---------|
| **Zona** | Origen del cliente (dónde está sentado) | Norte, VIP, Sur |
| **Venue/Quiosco** | Punto de operación (dónde se prepara) | Bar Norte, Cocina |
| **Turno** | Período de operación (el partido) | Guaiqueries vs Cocodrilos |

---

## 3. MODELO DE DATOS — NUEVO ESQUEMA

### Tablas nuevas requeridas

```sql
-- Zonas del estadio (dinámicas, CRUD completo)
zones (
  id, name, color, capacity, is_active, created_at
)

-- Relación Venue ↔ Zonas que atiende
venue_zones (
  id, venue_id FK, zone_id FK
  UNIQUE(venue_id, zone_id)
)

-- Relación Venue ↔ Usuarios asignados
venue_users (
  id, venue_id FK, user_id FK
  UNIQUE(venue_id, user_id)
)

-- Métodos de pago por venue
venue_payment_methods (
  id, venue_id FK, method, is_active
)
```

### Cambios en tablas existentes

| Tabla | Campo | Acción |
|-------|-------|--------|
| venues | capabilities JSON | ELIMINAR — reemplazar por venue_zones |
| orders | venue_destino_id | AGREGAR — venue al que fue derivada la orden |
| orders | zone_id | AGREGAR FK a tabla zones |

---

## 4. FLUJO OPERATIVO OPTIMIZADO

```
ANTES DEL PARTIDO
  1. Daniel entra a /admin/estructura
  2. Crea/activa zonas del estadio
  3. Crea/activa quioscos
  4. Asigna: qué zonas atiende cada quiosco
  5. Asigna: qué personal opera cada quiosco
  6. Configura: métodos de pago por quiosco
  7. Abre turno → sistema activo

DURANTE EL PARTIDO

  Flujo QR (cliente):
  QR Zona Norte → /menu?zona=Norte
  → Cliente selecciona productos → carrito
  → Confirma → POST /api/orders {zona: 'Norte', type: 'PUBLIC'}
  → Auto-routing: Norte → Bar Norte (venue que atiende Norte)
  → orden.venue_destino = Bar Norte
  → KDS Bar Norte muestra PUB-0001
  → Mesero hace bump → LISTO
  → Mesero delivery entrega en silla

  Flujo Mesero (LOC):
  Mesero en /pos/nueva-orden
  → Selecciona zona del cliente
  → Sistema auto-asigna venue por zona
  → LOC-XXXXX generado
  → KDS del venue correspondiente

  ENTRETIEMPO (pico):
  → Todos los quioscos activos simultáneamente
  → KDS prioriza por tiempo de espera (45s naranja / 90s rojo)
  → Meseros en modo delivery masivo

POST PARTIDO
  → Daniel cierra turno
  → Reporte automático generado
  → Exportar PDF/XLSX
```

---

## 5. ARQUITECTURA DE VISTAS — ADMIN

```
/admin/estructura
  Tab 1: ZONAS
    → Lista de zonas con color, capacidad, toggle activo
    → Crear zona: nombre, color picker, capacidad numérica
    → Editar / Eliminar (solo si sin órdenes activas)

  Tab 2: QUIOSCOS
    → Lista de venues con tipo, usuarios asignados, zonas que atiende
    → Crear quiosco: nombre, tipo (cocina/bar/matriz/quiosco)
    → Por quiosco: acordeón con sub-secciones:
        Zonas que atiende (multi-select dinámico desde tabla zones)
        Personal asignado (multi-select desde tabla users)
        Métodos de pago (checkboxes configurables)

  Tab 3: ASIGNACIONES (vista matriz)
    → Grid: Zonas (filas) × Quioscos (columnas)
    → Toggle visual para activar/desactivar cobertura
    → Vista de carga actual por quiosco
```

---

## 6. AUTO-ROUTING ENGINE

### Lógica de derivación

```typescript
async function routeOrder(zone: string): Promise<number> {
  // 1. Buscar venues que atienden esta zona
  const venues = await prisma.venueZone.findMany({
    where: { zone: { name: zone }, venue: { is_active: true } },
    include: { venue: true }
  })
  
  if (venues.length === 0) {
    // Fallback: venue principal (Matriz)
    return getDefaultVenue()
  }
  
  if (venues.length === 1) {
    return venues[0].venue_id
  }
  
  // Balanceo por carga: menor cantidad de órdenes activas
  const loads = await Promise.all(
    venues.map(v => getActiveOrderCount(v.venue_id))
  )
  const minLoad = Math.min(...loads)
  const index = loads.indexOf(minLoad)
  return venues[index].venue_id
}
```

---

## 7. SIMULADOR DE CARGA

### Escenarios de prueba

| Escenario | Usuarios | Órdenes/min | Descripción |
|-----------|----------|-------------|-------------|
| `tranquilo` | 50 | 5 | Día de poca afluencia |
| `normal` | 200 | 20 | Partido regular |
| `lleno` | 400 | 40 | Partido importante |
| `sold_out` | 700 | 70 | Capacidad máxima |

### Dashboard simulador (/admin/simulator)

```
┌─────────────────────────────────────────┐
│  SIMULADOR DE CARGA SPORTBAR            │
│  ○ Tranquilo  ○ Normal  ● Lleno  ○ 700  │
├─────────────────────────────────────────┤
│  ESTADIO EN VIVO                        │
│  [Norte: 45 órd] [Sur: 38 órd]          │
│  [VIP: 12 órd]   [General: 28 órd]      │
├─────────────────────────────────────────┤
│  QUIOSCOS                               │
│  Bar Norte: ████░░ 67% | 23 pendientes  │
│  Bar Sur:   ███░░░ 51% | 18 pendientes  │
│  Cocina:    █████░ 89% | 41 pendientes  │
│  VIP:       ██░░░░ 34% |  8 pendientes  │
├─────────────────────────────────────────┤
│  MÉTRICAS EN VIVO                       │
│  req/s: 12.4 | p95: 234ms | errors: 0   │
│  PUBs creados: 847 | LOCs: 23           │
├─────────────────────────────────────────┤
│  [▶ INICIAR] [⏸ PAUSAR] [⏹ DETENER]    │
│  [💾 EXPORTAR REPORTE]                  │
└─────────────────────────────────────────┘
```

---

## 8. ASIGNACIÓN DE AGENTES

### FASE 1 — Modelo base (T+0:00)

| Agente | Tarea | Archivos |
|--------|-------|---------|
| CLI #1 | Migraciones: zones, venue_zones, venue_users, venue_payment_methods | prisma/schema.prisma, migrations/ |
| CLI #2 | APIs CRUD: /api/zones, /api/venues/[id]/zones, /api/venues/[id]/users | src/app/api/zones/, src/app/api/venues/ |
| CoWork | UI /admin/estructura: Tab Zonas + Tab Quioscos + Tab Asignaciones | src/app/admin/estructura/ |

### FASE 2 — Flujo inteligente (T+1:00)

| Agente | Tarea | Archivos |
|--------|-------|---------|
| CLI #1 | Auto-routing engine + orders.venue_destino_id | src/lib/routing.ts, src/app/api/orders/ |
| CLI #2 | KDS filtrado por venue_zones (reemplazar capabilities) | src/app/api/kds/, src/app/kds/ |
| CLI #3 | Certify: tests routing + KDS por zona | src/lib/certify.ts |

### FASE 3 — Data demo + Stress (T+2:00)

| Agente | Tarea | Archivos |
|--------|-------|---------|
| CoWork | Seed completo: 5 zonas, 4 quioscos, 8 usuarios, 50 órdenes, 3 partidos | prisma/seed-demo.ts |
| CLI #1 | Simulador backend: src/lib/simulator.ts | src/lib/simulator.ts, src/app/api/simulate/ |
| CLI #2 | Dashboard simulador UI: /admin/simulator | src/app/admin/simulator/ |

### FASE 4 — Certificación final (T+3:00)

| Agente | Tarea |
|--------|-------|
| CLI #3 | Suite completa 65/65 PASS |
| CoWork | SYSTEM_MAP v2.0 + SESSION_HANDOFF + README + Guía Daniel |

---

## 9. CRITERIOS DE ÉXITO

```
✅ Cero hardcode en el sistema
✅ Daniel crea zonas y quioscos sin código
✅ Auto-routing funciona sin configuración manual
✅ Simulador muestra 700 usuarios sin caída
✅ 65/65 tests PASS en certify.ts
✅ SYSTEM_MAP v2.0 actualizado
✅ Guía operativa entregada a Daniel
✅ Exportación PDF/XLSX post-partido funcional
✅ QR sticker con color y textos configurables
✅ Analytics: visitas por zona, conversión QR→orden
```

---

## 10. REGLAS IRROMPIBLES (recordatorio)

```
ARQUITECTURA
  → Cero hardcode — todo configurable desde admin
  → CRUD completo en cada módulo sin excepción
  → Zona ≠ Venue — son entidades distintas
  → Auto-routing por tabla venue_zones, nunca por if/else

CÓDIGO
  → TypeScript estricto, nunca any
  → CSS Modules únicamente, nunca Tailwind
  → Tokens en tokens.css, nunca colores hardcodeados
  → Server Components default, Client solo con estado/eventos
  → Prisma eager loading, cero N+1

OPERACIÓN
  → Moneda REF (nunca $), Bs para conversión
  → Toda acción crítica: 56px height mínimo
  → Deploy: push local → pull VPS → build → pm2 restart
  → NUNCA tocar C:\laragon\www\synticorex
```

---

## 11. PROMPTS INICIALES — LISTOS PARA DISPARAR

### CLI #1 — Migraciones Fase 1
```
[EJECUTA]
Lee: prisma/schema.prisma, SYSTEM_MAP.md sección 3

TAREA: Crear migraciones para modelo relacional de zonas y venues.

MIGRACIÓN 1 — add_zones_table:
model Zone {
  id         Int      @id @default(autoincrement())
  name       String   @unique
  color      String   @default("#22c55e")
  capacity   Int      @default(0)
  is_active  Boolean  @default(true)
  created_at DateTime @default(now())
  venueZones VenueZone[]
  orders     Order[]
}

MIGRACIÓN 2 — add_venue_relations:
model VenueZone {
  id       Int   @id @default(autoincrement())
  venue_id Int
  zone_id  Int
  venue    Venue @relation(fields: [venue_id], references: [id])
  zone     Zone  @relation(fields: [zone_id], references: [id])
  @@unique([venue_id, zone_id])
}

model VenueUser {
  id       Int   @id @default(autoincrement())
  venue_id Int
  user_id  Int
  venue    Venue @relation(fields: [venue_id], references: [id])
  user     User  @relation(fields: [user_id], references: [id])
  @@unique([venue_id, user_id])
}

model VenuePaymentMethod {
  id        Int     @id @default(autoincrement())
  venue_id  Int
  method    String
  is_active Boolean @default(true)
  venue     Venue   @relation(fields: [venue_id], references: [id])
  @@unique([venue_id, method])
}

Agregar en Order: zone_id Int?, venue_destino_id Int?
Agregar relaciones back en Venue y User.

npx prisma migrate dev --name add_zones_venue_relations
git add -A && git commit -m "feat(db): zonas + venue_zones + venue_users + venue_payment_methods" && git push
Reporta hash y migraciones creadas.
```

### CLI #2 — APIs CRUD Zonas
```
[EJECUTA]
Lee: src/app/api/venues/route.ts, prisma/schema.prisma (después de que CLI #1 reporte su hash)

TAREA: Crear endpoints CRUD para zonas y asignaciones.

ARCHIVO 1 — src/app/api/zones/route.ts:
  GET: lista zonas is_active, con count de venue_zones
  POST: crear zona {name, color, capacity}
  Auth: admin

ARCHIVO 2 — src/app/api/zones/[id]/route.ts:
  GET, PUT, DELETE (soft: is_active=false si tiene órdenes)

ARCHIVO 3 — src/app/api/venues/[id]/zones/route.ts:
  GET: zonas asignadas al venue
  POST: asignar zona {zone_id}
  DELETE: desasignar zona ?zone_id=X

ARCHIVO 4 — src/app/api/venues/[id]/users/route.ts:
  GET, POST {user_id}, DELETE ?user_id=X

ARCHIVO 5 — src/app/api/venues/[id]/payment-methods/route.ts:
  GET, POST {method}, PATCH toggle, DELETE

TypeScript estricto, auth JWT admin en todos.
git add -A && git commit -m "feat(api): CRUD zonas + venue assignments" && git push
```

### CoWork — UI /admin/estructura
```
Repo sportbar. Lee: src/app/admin/estructura/page.tsx, src/app/admin/estructura/page.module.css, SYSTEM_MAP.md

ESPERA que CLI #1 reporte hash antes de empezar.

TAREA: Rediseñar /admin/estructura con 3 tabs.

TAB 1 — ZONAS:
  Lista de zonas con badge de color, capacidad, cantidad de quioscos que la atienden
  Crear zona: modal con nombre + color picker (6 colores predefinidos + custom) + capacidad
  Editar / Toggle activo inline / Eliminar con confirm

TAB 2 — QUIOSCOS:
  Lista de venues como cards expandibles
  Card contraída: nombre, tipo, N usuarios, N zonas, toggle activo
  Card expandida (3 secciones):
    Zonas que atiende: chips con X para desasignar + botón agregar (select de zonas disponibles)
    Personal: chips de usuarios asignados + botón agregar (select de usuarios)
    Métodos de pago: checkboxes de todos los métodos disponibles

TAB 3 — ASIGNACIONES:
  Tabla matriz: filas=zonas, columnas=quioscos
  Cada celda: toggle checkbox
  Al activar/desactivar → PATCH /api/venues/[id]/zones

CSS Modules, TypeScript estricto, dark theme, Lucide React.
git add -A && git commit -m "feat(estructura): tabs Zonas + Quioscos + Asignaciones" && git push
Deploy VPS al terminar.
```

---

*Documento creado: 30/05/2026 | Próxima actualización: al completar Fase 2*
