import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const STATUS_FLOW: Record<string, string> = {
  NUEVO: 'PREP',
  PREP: 'LISTO',
  LISTO: 'ENTREGADO',
}

export async function POST(req: NextRequest) {
  try {
    const { order_id, actor_code } = await req.json()

    if (!order_id || !actor_code) {
      return NextResponse.json({ success: false, error: 'order_id y actor_code requeridos' }, { status: 400 })
    }

    const order = await prisma.order.findUnique({ where: { id: order_id } })

    if (!order) {
      return NextResponse.json({ success: false, error: 'Orden no encontrada' }, { status: 404 })
    }

    const next = STATUS_FLOW[order.kitchen_status]
    if (!next) {
      return NextResponse.json({ success: false, error: 'Orden ya entregada' }, { status: 400 })
    }

    const updated = await prisma.order.update({
      where: { id: order_id },
      data: {
        kitchen_status: next as any,
        logs: {
          create: {
            action: 'STATUS_CHANGE',
            from_state: order.kitchen_status,
            to_state: next,
            actor_code,
          },
        },
      },
    })

    return NextResponse.json({ success: true, order: updated })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al actualizar estado' }, { status: 500 })
  }
}

