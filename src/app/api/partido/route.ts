import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface TurnoValue {
  is_active:       boolean
  partido_nombre:  string
  opened_at:       string
  opened_by:       string
  closed_at?:      string
}

export interface PartidoListItem {
  config_id:      number
  config_key:     string
  partido_nombre: string
  is_active:      boolean
  opened_at:      string
  closed_at:      string | null
  duration_min:   number
  opened_by:      string
}

// ── GET — lista de todos los turnos almacenados en Config ──────────────────────

export async function GET() {
  try {
    const rows = await prisma.config.findMany({
      where: { key: { startsWith: 'turno' } },
      orderBy: { id: 'desc' },
    })

    const items: PartidoListItem[] = []

    for (const row of rows) {
      try {
        const t = JSON.parse(row.value) as TurnoValue
        if (!t.opened_at) continue

        const openedAt   = new Date(t.opened_at)
        const closedAt   = t.closed_at ? new Date(t.closed_at) : null
        const durationMs = (closedAt ?? new Date()).getTime() - openedAt.getTime()

        items.push({
          config_id:      row.id,
          config_key:     row.key,
          partido_nombre: t.partido_nombre,
          is_active:      t.is_active,
          opened_at:      t.opened_at,
          closed_at:      t.closed_at ?? null,
          duration_min:   Math.floor(durationMs / 60_000),
          opened_by:      t.opened_by,
        })
      } catch {
        // skip malformed rows
      }
    }

    return NextResponse.json({ success: true, partidos: items })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al listar partidos' }, { status: 500 })
  }
}
