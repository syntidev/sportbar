# CLAUDE.md -- CafeBall
# POS + KDS + Visor de comandas para Sport Bar
# Stack: Next.js 14 + TypeScript + CSS Modules + Framer Motion + Radix UI + Prisma + MySQL + Supabase Realtime

## GOBERNANZA

Modos de operacion (activar con palabra clave):
CONSULTA  -> Responder max 5 lineas, sin codigo. PROHIBIDO: abrir archivos, escribir codigo.
DISENO    -> Proponer arquitectura. PROHIBIDO: implementar, tocar archivos.
EJECUTA   -> Implementar lo acordado. PROHIBIDO: inferir cambios fuera del scope.
REVISA    -> Auditar codigo existente. PROHIBIDO: proponer refactors no pedidos.
DEBUG     -> Diagnosticar SOLO el error. PROHIBIDO: tocar codigo fuera del scope.

Si el modo no esta declarado -> preguntar en UNA linea y PARAR.
NUNCA asumir modo EJECUTA por defecto.

## PROTOCOLO ANTI-DERIVA

Antes de cada respuesta verificar:
1. Me pidieron codigo? -> Solo entonces escribo codigo
2. El scope es claro? -> Si no, preguntar en 1 linea y parar
3. Voy a modificar algo fuera de lo pedido? -> PARAR
4. Encontre un bug fuera del scope? -> Reportar en 1 linea, NO corregir

Limites duros:
- Maximo 1 archivo modificado por request salvo instruccion explicita
- NUNCA continuar despues de completar el pedido
- NUNCA "ya que estoy aqui, tambien arregle..."

## PROYECTO

CafeBall -- POS operativo para Sport Bar del Gimnasio Ciudad de La Asuncion.
Cliente: Daniel Cheein - Cafe ConBike - Margarita, Venezuela.
Ruta local: C:\laragon\www\cafeball\
Repo referencia SOLO LECTURA: C:\laragon\www\synticorex\

## STACK

Next.js 14, React 18, TypeScript
CSS Modules (sin Tailwind -- design tokens propios en styles/tokens.css)
Framer Motion (animaciones y microinteracciones)
Radix UI (componentes base sin estilos impuestos)
Lucide React (iconos -- nunca emojis como iconos UI)
Prisma ORM + MySQL en VPS
Supabase Realtime (WebSocket solo para eventos)
IndexedDB + Service Worker (offline)
next-pwa (PWA instalable)
PM2 + Nginx en VPS

## REGLAS CRITICAS -- NUNCA VIOLAR

TypeScript: estricto en TODO archivo -- nunca any
CSS: CSS Modules unicamente -- nunca Tailwind, nunca colores hardcodeados
Early return obligatorio -- nesting maximo 2 niveles
Prisma: eager loading -- nunca N+1
API Routes en app/api/ -- nunca logica de negocio en componentes
Server Components por defecto -- Client solo con estado/eventos

MONEDA -- CRITICO:
- Precios en USD como referencia interna
- Al cobrar: price_usd x getCurrentRate() = total_bs
- Simbolo USD: REF (nunca $)
- Simbolo bolivares: Bs.
- Tasa desde DollarRateService del VPS synticorex (readonly)
- NUNCA bloquear operacion por falta de tasa

TICKETS -- IRROMPIBLE:
- Origen QR publico: prefijo PUB- + contador independiente
- Origen mesero: prefijo LOC- + contador independiente
- Cada ticket incluye: codigo mesero, nombre, apellido, cedula, zona, asiento
- Estados cocina: NUEVO -> PREP -> LISTO -> ENTREGADO
- Estados pago: PEND -> PAID / CREDIT / CANCELLED

KDS ROUTING -- IRROMPIBLE:
- Hamburguesas / Raciones -> KDS Cocina
- Bebidas -> KDS Bar
- Orden mixta -> ambos KDS simultaneo, Despacho espera los dos bumps
- NUNCA enviar bebida a cocina

ROLES -- NUNCA VIOLAR:
- mesero: tomar ordenes, registrar cobros
- cocina: ver KDS cocina, hacer bump
- bar: ver KDS bar, hacer bump
- despacho: ver KDS despacho, asignar mesero
- validador: revisar fotos comprobantes, log fraude
- admin: todo + cerrar turno + reportes (Daniel)

PIN:
- 4 digitos hasheado con bcrypt
- Throttle: 5 intentos por minuto por IP
- Default: 1234

OFFLINE:
- IndexedDB guarda ordenes sin red
- Service Worker sincroniza al reconectar
- ID temporal offline -> ID definitivo al sincronizar
- Indicador visual de estado de conexion

ICONOS: Lucide React UNICAMENTE -- nunca emojis en UI
## DESIGN TOKENS -- PALETA CAFEBALL

Fusion Guaiqueries + Cafe ConBike. Agregar en styles/tokens.css:

--color-primary: #2E7D32       verde intenso Guaiqueries
--color-accent: #C62828        rojo llama Guaiqueries
--color-bg: #0a0a0a            negro profundo estadio
--color-brand: #F5A623         naranja vibrante Cafe ConBike
--color-brand-warm: #8B6914    cafe marron rueda ConBike
--color-surface: #111411       negro con toque verde
--color-surface-2: #1a1f1a     cards y panels
--color-border: rgba(46,125,50,0.25)  verde translucido
--color-text: #f0f5f0          blanco con toque verde
--color-text-muted: rgba(240,245,240,0.5)

Estados operativos:
--color-nuevo: #F5A623         naranja -- orden nueva
--color-prep: #2E7D32          verde -- en preparacion
--color-listo: #4CAF50         verde claro -- listo para entregar
--color-pagado: #4CAF50        verde -- cobrado
--color-credito: #7C4DFF       violeta -- fiado
--color-pendiente: #F5A623     naranja -- pendiente de cobro
--color-cancelado: #C62828     rojo -- cancelado

Sensacion: negro estadio + verde cancha + naranja cafe. El mesero abre la app y siente que esta en el juego.


## CHECKLIST PRE-ENTREGA

- TypeScript estricto -- sin any
- CSS Modules -- sin Tailwind ni colores hardcodeados
- Sin N+1 en Prisma
- Logica en API routes, no en componentes
- REF / Bs. -- nunca signo dolar
- KDS routing correcto
- Sin archivos fuera del scope tocados
- Iconos Lucide React

## AGENTES

consultant -> Antes de ejecutar, analisis y viabilidad
executor   -> Implementar algo ya definido
reviewer   -> Auditar codigo entregado
debugger   -> Diagnosticar error especifico

## ARCHIVOS CLAVE

app/api/orders/route.ts        -> CRUD ordenes
app/api/auth/pin/route.ts      -> verificacion PIN
app/api/currency/route.ts      -> tasa BCV readonly
app/api/kds/bump/route.ts      -> bump de estacion
app/pos/page.tsx               -> PWA meseros home 3 botones
app/kds/cocina/page.tsx        -> KDS Cocina
app/kds/bar/page.tsx           -> KDS Bar
app/kds/despacho/page.tsx      -> KDS Despacho
app/menu/page.tsx              -> Catalogo publico QR
app/admin/page.tsx             -> Panel admin Daniel
lib/prisma.ts                  -> instancia Prisma
lib/supabase.ts                -> cliente Supabase Realtime
lib/currency.ts                -> helper tasa BCV
lib/indexeddb.ts               -> storage offline
lib/ticket.ts                  -> generacion PUB/LOC + contadores
styles/tokens.css              -> design tokens globales
prisma/schema.prisma           -> esquema DB

## DOMINIOS

pos.cafeconbike.com          -> PWA interna meseros KDS admin
sportbar.cafeconbike.com     -> Catalogo publico QR clientes
cafeconbike.com              -> Landing comercial futuro