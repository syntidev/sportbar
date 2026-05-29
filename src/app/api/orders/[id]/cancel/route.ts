import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'

const CancelSchema = z.object({
  reason: z.string().min(10, 'El motivo debe tener al menos 10 caracteres'),
})

function getSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET ?? '')
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const token = req.cookies.get('cafeball_session')?.value
  if (!token) {
    return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
  }

  let actorId: number
  let actorRole: string

  try {
    const { payload } = await jwtVerify(token, getSecret())
    actorId   = payload['id']   as number
    actorRole = payload['role'] as string
  } catch {
    return NextResponse.json({ success: false, error: 'Sesión inválida' }, { status: 401 })
  }

  if (actorRole !== 'admin') {
    return NextResponse.json({ success: false, error: 'Sin permiso para anular órdenes' }, { status: 403 })
  }

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

  const parsed = CancelSchema.safeParse(body)
  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => i.message)
    return NextResponse.json({ success: false, errors }, { status: 400 })
  }

  const { reason } = parsed.data

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      select: { id: true, code: true, payment_status: true },
    })

    if (!order) {
      return NextResponse.json({ success: false, error: 'Orden no encontrada' }, { status: 404 })
    }

    if (order.payment_status === 'CANCELLED') {
      return NextResponse.json({ success: false, error: 'La orden ya está anulada' }, { status: 409 })
    }

    const [updated, log] = await prisma.$transaction([
      prisma.order.update({
        where: { id },
        data: { payment_status: 'CANCELLED' },
        include: {
          items: { include: { product: true } },
          user:  { select: { code: true, name: true } },
        },
      }),
      prisma.cancellationLog.create({
        data: {
          order_id:        id,
          order_code:      order.code,
          cancelled_by:    actorId,
          reason,
          previous_status: order.payment_status,
        },
      }),
    ])

    return NextResponse.json({ success: true, order: updated, log })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al anular la orden' }, { status: 500 })
  }
}
