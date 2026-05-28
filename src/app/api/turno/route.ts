import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const TURNO_KEY = 'turno_activo'

interface TurnoValue {
  is_active: boolean
  partido_nombre: string
  opened_at: string
  opened_by: string
  closed_at?: string
  meseros_activos?: string[]
}

function emptyTurno(): TurnoValue {
  return { is_active: false, partido_nombre: '', opened_at: '', opened_by: '' }
}

async function readTurno(): Promise<TurnoValue> {
  const row = await prisma.config.findUnique({ where: { key: TURNO_KEY } })
  if (!row) return emptyTurno()
  try {
    return JSON.parse(row.value) as TurnoValue
  } catch {
    return emptyTurno()
  }
}

const AbrirTurnoSchema = z.object({
  partido_nombre:  z.string().trim().min(2),
  opened_by:       z.string().min(1),
  meseros_activos: z.array(z.string()).optional(),
})

// ── GET — estado actual ───────────────────────────────────────────────────────

export async function GET() {
  try {
    const turno = await readTurno()
    return NextResponse.json({ success: true, turno })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al leer turno' }, { status: 500 })
  }
}

// ── POST — abrir turno ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = AbrirTurnoSchema.safeParse(body)

    if (!result.success) {
      const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
      return NextResponse.json({ success: false, errors }, { status: 400 })
    }

    const { partido_nombre, opened_by, meseros_activos } = result.data

    const turno: TurnoValue = {
      is_active: true,
      partido_nombre,
      opened_by,
      opened_at: new Date().toISOString(),
      meseros_activos: meseros_activos ?? [],
    }

    await prisma.$transaction([
      prisma.config.upsert({
        where:  { key: TURNO_KEY },
        update: { value: JSON.stringify(turno) },
        create: { key: TURNO_KEY, value: JSON.stringify(turno) },
      }),
      prisma.ticketCounter.upsert({
        where:  { prefix: 'LOC' },
        update: {},
        create: { prefix: 'LOC', last: 0 },
      }),
      prisma.ticketCounter.upsert({
        where:  { prefix: 'PUB' },
        update: {},
        create: { prefix: 'PUB', last: 0 },
      }),
    ])

    return NextResponse.json({ success: true, turno })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al abrir turno' }, { status: 500 })
  }
}

// ── DELETE — cerrar turno ─────────────────────────────────────────────────────

export async function DELETE() {
  try {
    const turno = await readTurno()

    if (!turno.is_active) {
      return NextResponse.json({ success: false, error: 'No hay turno activo' }, { status: 409 })
    }

    const closed: TurnoValue = { ...turno, is_active: false, closed_at: new Date().toISOString() }

    await prisma.config.upsert({
      where:  { key: TURNO_KEY },
      update: { value: JSON.stringify(closed) },
      create: { key: TURNO_KEY, value: JSON.stringify(closed) },
    })

    return NextResponse.json({ success: true, turno: closed })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al cerrar turno' }, { status: 500 })
  }
}
