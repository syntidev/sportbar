# CAFEBALL -- CONTEXTO DE PROYECTO
# Version: 1.0 | Mayo 2026

## NEGOCIO

POS operativo para Sport Bar en Gimnasio Ciudad de La Asuncion.
Sede Guaiqueries de Margarita LPB. Aprox 8500 espectadores.
Operacion eventual -- solo dias de partido.
35 meseros - 3 zonas - tiempo critico = descanso del partido.

## ARQUITECTURA DE ARCHIVOS CLAVE

app/api/orders/route.ts        -> CRUD ordenes
app/api/auth/pin/route.ts      -> verificacion PIN
app/api/currency/route.ts      -> tasa BCV readonly
app/api/kds/bump/route.ts      -> bump de estacion
app/pos/page.tsx               -> PWA meseros
app/kds/cocina/page.tsx        -> KDS Cocina
app/kds/bar/page.tsx           -> KDS Bar
app/kds/despacho/page.tsx      -> KDS Despacho
app/menu/page.tsx              -> Catalogo publico QR
app/admin/page.tsx             -> Panel Daniel
components/pos/                -> componentes PWA mesero
components/kds/                -> componentes KDS
components/menu/               -> componentes catalogo publico
components/ui/                 -> componentes base reutilizables
lib/prisma.ts                  -> instancia Prisma
lib/supabase.ts                -> cliente Supabase Realtime
lib/currency.ts                -> helper tasa BCV
lib/indexeddb.ts               -> storage offline
lib/ticket.ts                  -> generacion PUB/LOC + contadores
styles/tokens.css              -> design tokens globales
prisma/schema.prisma           -> esquema DB completo

## ZONAS OPERATIVAS

Norte    -> Tribuna norte, filas + asiento, cedula opcional
Sur      -> Tribuna sur, filas + asiento, cedula opcional
VIP      -> Palcos numerados, zona de credito, cedula OBLIGATORIA
Externa  -> Perimetro sin asiento fijo, cedula opcional

## ACTORES

USR-XXX  -> Mesero        -> PWA PIN
COC-XXX  -> Cocina        -> KDS tablet
BAR-XXX  -> Bar           -> KDS tablet
DES-XXX  -> Despacho      -> KDS tablet
VAL-XXX  -> Validador     -> Vista web
ADM-001  -> Admin Daniel  -> Panel completo
cliente  -> URL publica QR

## MENU SPORT BAR

Hamburguesas -> KDS Cocina
Raciones     -> KDS Cocina
Bebidas      -> KDS Bar

## METODOS DE PAGO ACTIVOS

Pago Movil - Punto de Venta - Efectivo - Zelle - Binance - USDT

## PALETA DE COLORES CAFEBALL

Fusion visual Guaiqueries de Margarita + Cafe ConBike.
Negro estadio + verde cancha + naranja cafe = identidad unica.

Guaiqueries: verde #2E7D32, rojo #C62828, negro #0a0a0a
Cafe ConBike: naranja #F5A623, marron #8B6914
Surfaces: #111411 fondo, #1a1f1a cards, rgba(46,125,50,0.25) bordes
Texto: #f0f5f0 principal, rgba(240,245,240,0.5) secundario

Estados: nuevo #F5A623, prep #2E7D32, listo #4CAF50, credito #7C4DFF, cancelado #C62828

## DOMINIOS

pos.cafeconbike.com          -> PWA interna
sportbar.cafeconbike.com     -> Catalogo publico QR
cafeconbike.com              -> Landing comercial futuro

## CONEXIONES EXTERNAS

MySQL VPS principal      -> Prisma conexion principal
MySQL synticorex VPS     -> Prisma readonly solo dollar_rates
Supabase FREE tier       -> WebSocket realtime solo eventos