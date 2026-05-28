# AGENTS.md -- CafeBall
# Version: 1.0 | Mayo 2026

## PROYECTO

POS Sport Bar Venezuela. Next.js 14 + Prisma + MySQL + Supabase Realtime.
Ruta local: C:\laragon\www\cafeball\

## LEER SIEMPRE PRIMERO

1. CLAUDE.md -- gobernanza y reglas criticas
2. .doc/MASTER_DOC_SPORTBAR_v2.docx -- arquitectura completa
3. .github/CAFEBALL-CONTEXT.md -- contexto tecnico

## AGENTES

consultant -> .github/agents/consultant.agent.md -> Analisis antes de ejecutar
executor   -> .github/agents/executor.agent.md   -> Implementar ya definido
reviewer   -> .github/agents/reviewer.agent.md   -> Auditar codigo entregado
debugger   -> .github/agents/debugger.agent.md   -> Diagnosticar error especifico

## FLUJO

Tarea ambigua -> consultant primero
Tarea clara   -> executor directamente
Post-impl     -> reviewer
Bug           -> debugger

## REGLAS QUE NINGUN AGENTE PUEDE VIOLAR

- TypeScript estricto -- nunca any
- CSS Modules -- nunca Tailwind ni colores hardcodeados
- Moneda: REF para USD, Bs. para bolivares -- nunca signo dolar
- KDS: bebidas -> Bar, comida -> Cocina -- nunca mezclar
- Prefijos PUB- / LOC- en tickets -- contadores independientes
- 1 archivo por request salvo instruccion explicita
- NUNCA tocar C:\laragon\www\synticorex