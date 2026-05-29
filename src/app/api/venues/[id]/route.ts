import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const PatchSchema = z.object({
  is_active:    z.boolean().optional(),
  name:         z.string().trim().min(1).max(100).optional(),
  type:         z.enum(['matriz', 'quiosco', 'cocina']).optional(),
  capabilities: z.array(z.enum(['comida', 'cerveza', 'licor_fuerte'])).optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'Sin campos para actualizar' })

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
    const venue = await prisma.venue.update({
      where: { id },
      data:  parsed.data,
      select: { id: true, name: true, type: true, capabilities: true, is_active: true },
    })

    return NextResponse.json({ success: true, venue })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Error al actualizar el punto de venta' },
      { status: 500 },
    )
  }
}
