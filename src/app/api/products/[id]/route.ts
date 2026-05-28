import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const PatchBodySchema = z.object({
  is_active: z.boolean(),
})

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

  const parsed = PatchBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 422 },
    )
  }

  try {
    const product = await prisma.product.update({
      where: { id },
      data:  { is_active: parsed.data.is_active },
      select: { id: true, is_active: true },
    })

    return NextResponse.json({ success: true, product })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Error al actualizar producto' },
      { status: 500 },
    )
  }
}
