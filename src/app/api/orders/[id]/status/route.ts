import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const PatchStatusSchema = z.object({
  kitchen_status: z.enum(['NUEVO', 'PREP', 'LISTO', 'ENTREGADO']).optional(),
  payment_status: z.enum(['PEND', 'PAID', 'CREDIT', 'CANCELLED']).optional(),
  payment_method: z.string().optional(),
  receipt_photo:  z.string().optional(),
  ref_code:       z.string().optional(),
  note:           z.string().optional(),
  actor_code:     z.string().min(1),
}).refine((d) => d.kitchen_status ?? d.payment_status, {
  message: 'Debe indicar kitchen_status o payment_status',
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = parseInt(params.id, 10)
  if (isNaN(id)) {
    return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 })
  }

  try {
    const body = await req.json()
    const result = PatchStatusSchema.safeParse(body)

    if (!result.success) {
      const errors = result.error.issues.map((i) => i.message)
      return NextResponse.json({ success: false, errors }, { status: 400 })
    }

    const { kitchen_status, payment_status, payment_method, receipt_photo, ref_code, note, actor_code } = result.data

    const order = await prisma.order.findUnique({
      where: { id },
      select: { id: true, kitchen_status: true, payment_status: true },
    })

    if (!order) {
      return NextResponse.json({ success: false, error: 'Orden no encontrada' }, { status: 404 })
    }

    const paymentData = payment_status
      ? {
          ...(payment_method  && { payment_method }),
          ...(receipt_photo   && { receipt_photo }),
          ...(payment_status === 'PAID' && { paid_at: new Date() }),
        }
      : {}

    const noteText = [ref_code ? `Ref: ${ref_code}` : '', note ?? ''].filter(Boolean).join(' | ') || undefined

    const [updated] = await prisma.$transaction([
      prisma.order.update({
        where: { id },
        data: {
          ...(kitchen_status && { kitchen_status }),
          ...(payment_status && { payment_status }),
          ...paymentData,
          ...(noteText && { note: noteText }),
        },
        include: {
          items: { include: { product: true } },
          user:  { select: { code: true, name: true } },
        },
      }),
      prisma.orderLog.create({
        data: {
          order_id:   id,
          action:     kitchen_status ? 'KITCHEN_STATUS_CHANGE' : 'PAYMENT_STATUS_CHANGE',
          from_state: kitchen_status ? order.kitchen_status : order.payment_status,
          to_state:   kitchen_status ?? payment_status ?? '',
          actor_code,
          note:       noteText,
        },
      }),
    ])

    return NextResponse.json({ success: true, order: updated })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al actualizar estado' }, { status: 500 })
  }
}
