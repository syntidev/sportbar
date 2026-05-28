import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const ReorderSchema = z.object({
  order: z.array(z.number().int().positive()).min(1),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ success: false, error: 'Body inválido' }, { status: 400 })
  }

  const parsed = ReorderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Orden inválido' }, { status: 422 })
  }

  try {
    await prisma.$transaction(
      parsed.data.order.map((id, idx) =>
        prisma.paymentMethod.update({ where: { id }, data: { sort_order: idx } }),
      ),
    )
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al reordenar' }, { status: 500 })
  }
}
