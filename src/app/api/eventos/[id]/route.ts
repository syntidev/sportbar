import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

function parseId(params: { id: string }): number | null {
  const n = parseInt(params.id, 10)
  return isNaN(n) ? null : n
}

const PatchSchema = z.object({
  action: z.enum(['activate', 'deactivate']),
})

// ── PATCH /api/eventos/[id] ───────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = parseId(await params)
  if (!id) return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ success: false, error: 'Body inválido' }, { status: 400 })
  }

  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Acción inválida' },
      { status: 422 },
    )
  }

  try {
    if (parsed.data.action === 'activate') {
      // Solo un evento activo a la vez
      await prisma.$transaction([
        prisma.event.updateMany({ data: { is_active: false } }),
        prisma.event.update({ where: { id }, data: { is_active: true } }),
      ])
    } else {
      await prisma.event.update({ where: { id }, data: { is_active: false } })
    }

    const event = await prisma.event.findUnique({
      where: { id },
      include: { _count: { select: { venues: true, orders: true } } },
    })
    return NextResponse.json({ success: true, event })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al actualizar evento' }, { status: 500 })
  }
}

// ── DELETE /api/eventos/[id] ──────────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = parseId(await params)
  if (!id) return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 })

  try {
    const event = await prisma.event.findUnique({
      where: { id },
      include: { _count: { select: { orders: true } } },
    })
    if (!event) return NextResponse.json({ success: false, error: 'Evento no encontrado' }, { status: 404 })
    if (event._count.orders > 0) {
      return NextResponse.json(
        { success: false, error: 'No se puede eliminar: tiene órdenes asociadas' },
        { status: 409 },
      )
    }
    await prisma.event.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al eliminar evento' }, { status: 500 })
  }
}
