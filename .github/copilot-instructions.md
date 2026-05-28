# CAFEBALL -- INSTRUCCIONES MAESTRAS PARA AGENTES IA
# Version: 1.0 | Mayo 2026
# LEER COMPLETO ANTES DE GENERAR CUALQUIER RESPUESTA

## GOBERNANZA

Modos de operacion (activar con palabra clave):
CONSULTA  -> max 5 lineas, sin codigo
DISENO    -> proponer arquitectura, sin implementar
EJECUTA   -> implementar lo acordado exactamente
REVISA    -> auditar codigo existente
DEBUG     -> diagnosticar SOLO el error reportado

Si el modo no esta declarado -> preguntar en UNA linea y PARAR.
NUNCA asumir modo EJECUTA por defecto.

Protocolo anti-deriva:
1. Me pidieron codigo? -> Solo entonces escribo codigo
2. Scope claro? -> Si no, preguntar 1 linea y parar
3. Modificar algo fuera del scope? -> PARAR
4. Bug fuera del scope? -> Reportar 1 linea, NO corregir

Limites: 1 archivo por request - no continuar al terminar - no arreglar lo no pedido

## PROYECTO

CafeBall POS - Sport Bar - Margarita Venezuela
Stack: Next.js 14 + TypeScript + CSS Modules + Framer Motion + Radix UI + Prisma + MySQL + Supabase Realtime
Ruta: C:\laragon\www\cafeball\
Repo SOLO LECTURA: C:\laragon\www\synticorex\

## REGLAS CRITICAS

TypeScript estricto en TODO -- nunca any
CSS Modules UNICAMENTE -- nunca Tailwind, nunca inline
Design tokens en styles/tokens.css
Dark theme por defecto
Server Components por defecto -- Client solo con estado/eventos

MONEDA:
- USD interno: simbolo REF (nunca signo dolar)
- Al cobrar: price_usd x tasa = total_bs
- Tasa readonly desde synticorex DB
- NUNCA bloquear operacion por falta de tasa

TICKETS:
- PUB-XXXXX = QR cliente
- LOC-XXXXX = mesero
- Contadores independientes por prefijo

KDS IRROMPIBLE:
- Comida -> KDS Cocina
- Bebidas -> KDS Bar
- Mixta -> ambos KDS simultaneo

ICONOS: Lucide React UNICAMENTE -- nunca emojis en UI

## CHECKLIST PRE-ENTREGA

TypeScript estricto sin any
CSS Modules sin colores hardcodeados
Sin N+1 en Prisma
Logica en API routes no en componentes
REF y Bs. -- nunca signo dolar
KDS routing correcto
1 archivo modificado por request