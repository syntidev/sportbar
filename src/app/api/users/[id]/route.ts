import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const PatchSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('toggle'), is_active: z.boolean() }),
  z.object({ op: z.literal('pin'),    pin: z.string().regex(/^\d{4}$/, 'PIN debe ser 4 dígitos numéricos') }),
  z.object({
    op:           z.literal('update'),
    name:         z.string().min(1).max(100),
    lastname:     z.string().min(1).max(100),
    role:         z.enum(['mesero', 'cocina', 'bar', 'despacho', 'validador']),
    venue_id:     z.number().int().positive().nullable().optional(),
    access_start: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
    access_end:   z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
    access_days:  z.array(z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])).nullable().optional(),
    pin:          z.string().regex(/^\d{4}$/).optional(),
  }),
])

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = parseInt(params.id, 10)
  if (isNaN(id)) {
    return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Body inválido' }, { status: 400 })
  }

  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 422 },
    )
  }

  try {
    if (parsed.data.op === 'toggle') {
      const user = await prisma.user.update({
        where:  { id },
        data:   { is_active: parsed.data.is_active },
        select: { id: true, is_active: true },
      })
      return NextResponse.json({ success: true, user })
    }

    if (parsed.data.op === 'update') {
      const d = parsed.data
      const data: Parameters<typeof prisma.user.update>[0]['data'] = {
        name:         d.name,
        lastname:     d.lastname,
        role:         d.role,
        venue_id:     d.venue_id     ?? null,
        access_start: d.access_start ?? null,
        access_end:   d.access_end   ?? null,
        access_days:  d.access_days  ?? Prisma.JsonNull,
      }
      if (d.pin) data.pin = await bcrypt.hash(d.pin, 10)
      const user = await prisma.user.update({
        where:  { id },
        data,
        select: {
          id: true, name: true, lastname: true, role: true,
          venue_id: true, access_start: true, access_end: true, access_days: true,
        },
      })
      return NextResponse.json({ success: true, user })
    }

    // op === 'pin'
    const hashedPin = await bcrypt.hash(parsed.data.pin, 10)
    await prisma.user.update({
      where: { id },
      data:  { pin: hashedPin },
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al actualizar usuario' }, { status: 500 })
  }
}

// ── DELETE /api/users/[id] ────────────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = parseInt(params.id, 10)
  if (isNaN(id)) {
    return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 })
  }

  try {
    const [orderCount, cancCount] = await Promise.all([
      prisma.order.count({ where: { created_by: id } }),
      prisma.cancellationLog.count({ where: { cancelled_by: id } }),
    ])

    if (orderCount > 0 || cancCount > 0) {
      const total = orderCount + cancCount
      return NextResponse.json(
        {
          success: false,
          error:   `No se puede eliminar: el usuario tiene ${total} registro(s) asociado(s)`,
        },
        { status: 409 },
      )
    }

    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al eliminar usuario' }, { status: 500 })
  }
}
