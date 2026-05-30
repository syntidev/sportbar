import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Public — no auth required
export async function GET(
  _req: NextRequest,
  { params }: { params: { code: string } },
) {
  const code = params.code.toUpperCase()
  try {
    const [order, bizRow] = await Promise.all([
      prisma.order.findUnique({
        where:   { code },
        include: {
          items: {
            include: { product: { select: { name: true, category: true } } },
            orderBy: { id: 'asc' },
          },
        },
      }),
      prisma.config.findUnique({ where: { key: 'business_name' } }),
    ])

    if (!order) {
      return NextResponse.json({ success: false, error: 'Orden no encontrada' }, { status: 404 })
    }

    return NextResponse.json({
      success:      true,
      businessName: bizRow?.value ?? 'Sport Bar',
      order: {
        code:           order.code,
        origin:         order.origin,
        customer_name:  `${order.customer_name} ${order.customer_lastname}`.trim(),
        zone:           order.zone,
        seat:           order.seat,
        total_usd:      Number(order.total_usd),
        total_bs:       Number(order.total_bs),
        rate_used:      Number(order.rate_used),
        payment_status: order.payment_status,
        kitchen_status: order.kitchen_status,
        payment_method: order.payment_method,
        created_at:     order.created_at.toISOString(),
        items: order.items.map((i) => ({
          name:      i.product.name,
          category:  i.product.category,
          qty:       i.qty,
          price_usd: Number(i.price_usd),
          subtotal:  Number(i.subtotal),
        })),
      },
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al obtener orden' }, { status: 500 })
  }
}
