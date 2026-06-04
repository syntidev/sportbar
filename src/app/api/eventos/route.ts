import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const CreateSchema = z.object({
  name: z.string().trim().min(1, 'Nombre requerido').max(120),
  type: z.enum(['VENUE', 'OUTDOOR']).default('VENUE'),
  date: z.string().optional(),
})

function toSlug(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim() + '-' + Date.now()
}

// ── GET /api/eventos ──────────────────────────────────────────────────────────

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      orderBy: [{ is_active: 'desc' }, { created_at: 'desc' }],
      include: {
        _count: { select: { venues: true, orders: true } },
      },
    })
    return NextResponse.json({ success: true, events })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al obtener eventos' }, { status: 500 })
  }
}

// ── POST /api/eventos ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ success: false, error: 'Body inválido' }, { status: 400 })
  }

  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
      { status: 422 },
    )
  }

  const { name, type, date } = parsed.data

  try {
    const event = await prisma.event.create({
      data: {
        name,
        slug:      toSlug(name),
        type,
        date:      date ? new Date(date) : null,
        is_active: false,
      },
      include: { _count: { select: { venues: true, orders: true } } },
    })
    return NextResponse.json({ success: true, event }, { status: 201 })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al crear evento' }, { status: 500 })
  }
}
