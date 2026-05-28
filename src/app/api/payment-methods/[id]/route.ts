import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const UpdateSchema = z.object({
  name:      z.string().min(1, 'Nombre requerido').max(80),
  type:      z.enum(['cash', 'transfer', 'mobile', 'biometric', 'other']),
  bank_name: z.string().max(100).nullable().optional(),
})

function allMethods() {
  return prisma.paymentMethod.findMany({ orderBy: { sort_order: 'asc' } })
}

function parseId(raw: string) {
  const id = parseInt(raw, 10)
  return isNaN(id) ? null : id
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = parseId(params.id)
  if (!id) return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ success: false, error: 'Body inválido' }, { status: 400 })
  }

  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 422 })
  }

  try {
    await prisma.paymentMethod.update({
      where: { id },
      data: {
        name:      parsed.data.name,
        type:      parsed.data.type,
        bank_name: parsed.data.bank_name ?? null,
      },
    })
    return NextResponse.json({ success: true, methods: await allMethods() })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al actualizar método' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = parseId(params.id)
  if (!id) return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 })

  try {
    await prisma.paymentMethod.delete({ where: { id } })
    return NextResponse.json({ success: true, methods: await allMethods() })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al eliminar método' }, { status: 500 })
  }
}
