import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentRate, calcBs } from '@/lib/dollar-rate'
import { generateTicketCode } from '@/lib/ticket'
import { routeOrder } from '@/lib/routing'
import type { KitchenStatus, Zone } from '@/types'

const OrderItemSchema = z.object({
  product_id: z.coerce.number().int().positive(),
  qty:        z.coerce.number().int().min(1),
  price_usd:  z.coerce.number().positive(),
})

const CreateOrderSchema = z.object({
  origin:            z.enum(['PUB', 'LOC']),
  flujo:             z.enum(['A', 'B']).optional(),
  created_by:        z.number().int().positive().optional(),
  customer_name:     z.string().min(1),
  customer_lastname: z.string().min(1).optional(),
  customer_id:       z.string().optional(),
  zone:              z.enum(['Norte', 'Sur', 'VIP', 'Externa']),
  seat:              z.string().optional(),
  note:              z.string().optional(),
  items:             z.array(OrderItemSchema).min(1, 'La orden debe tener al menos un item'),
})

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status  = searchParams.get('status') as KitchenStatus | 'active' | null
    const payment = searchParams.get('payment')   // 'pending' => PEND|CREDIT
    const zone    = searchParams.get('zone') as Zone | null
    const limit   = Math.min(parseInt(searchParams.get('limit') ?? '100', 10) || 100, 500)

    const where =
      payment === 'pending'
        ? { payment_status: { in: ['PEND', 'CREDIT'] as ('PEND' | 'CREDIT')[] } }
        : status === 'active'
        ? { kitchen_status: { not: 'ENTREGADO' as KitchenStatus }, payment_status: { not: 'CANCELLED' as const } }
        : { ...(status && { kitchen_status: status }), ...(zone && { zone }) }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: { include: { product: true } },
        user: { select: { code: true, name: true } },
        validation: true,
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    })

    return NextResponse.json({ success: true, orders })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al obtener ordenes' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = CreateOrderSchema.safeParse(body)

    if (!result.success) {
      const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
      return NextResponse.json({ success: false, errors }, { status: 400 })
    }

    const {
      origin, flujo, created_by: rawCreatedBy, customer_name, customer_lastname,
      customer_id, zone, seat, note, items,
    } = result.data

    // PUB orders have no logged-in user — resolve to first system user
    let userId = rawCreatedBy
    if (!userId) {
      if (origin !== 'PUB') {
        return NextResponse.json({ success: false, error: 'created_by es requerido' }, { status: 400 })
      }
      const sysUser = await prisma.user.findFirst({ orderBy: { id: 'asc' }, select: { id: true } })
      if (!sysUser) {
        return NextResponse.json({ success: false, error: 'Sistema sin usuarios configurados' }, { status: 500 })
      }
      userId = sysUser.id
    }

    const [rate, code, venue_destino_id, zoneRow] = await Promise.all([
      getCurrentRate(),
      generateTicketCode(origin),
      routeOrder(zone),
      prisma.zone.findUnique({ where: { name: zone }, select: { id: true } }),
    ])

    const total_usd  = items.reduce((sum, item) => sum + item.price_usd * item.qty, 0)
    const total_bs   = calcBs(total_usd, rate)
    const zone_id    = zoneRow?.id ?? null

    const order = await prisma.order.create({
      data: {
        code, origin, flujo, zone, seat, customer_name, customer_lastname: customer_lastname ?? '',
        customer_id, note, total_usd, rate_used: rate, total_bs,
        zone_id, venue_destino_id,
        created_by: userId,
        items: {
          create: items.map((item) => ({
            product_id: item.product_id,
            qty:        item.qty,
            price_usd:  item.price_usd,
            subtotal:   item.price_usd * item.qty,
          })),
        },
        logs: {
          create: {
            action:     'CREATED',
            to_state:   'NUEVO',
            actor_code: origin === 'PUB' ? 'PUB' : ('USR-' + String(userId).padStart(3, '0')),
          },
        },
      },
      include: { items: { include: { product: true } } },
    })

    // Analytics — fire-and-forget
    void prisma.analyticsEvent.create({
      data: { event_type: 'order_placed', zone, device_type: null },
    }).catch(() => undefined)

    return NextResponse.json({ success: true, order }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: 'Error al crear orden' }, { status: 500 })
  }
}
