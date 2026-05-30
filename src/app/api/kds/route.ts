import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'
import type { KitchenStatus, PaymentStatus } from '@/types'

const COOKIE_NAME = 'cafeball_session'

function getSecret(): Uint8Array {
  return new TextEncoder().encode(process.env.JWT_SECRET ?? '')
}

const VALID_STATUSES = new Set<string>(['NUEVO', 'PREP', 'LISTO', 'ENTREGADO'])

export async function GET(req: NextRequest) {
  // 1. Auth
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })

  let userId: number
  let userRole: string
  try {
    const { payload } = await jwtVerify(token, getSecret())
    userId   = Number(payload['id'])
    userRole = String(payload['role'])
  } catch {
    return NextResponse.json({ success: false, error: 'Sesión inválida' }, { status: 401 })
  }

  // 2. Query params
  const { searchParams } = new URL(req.url)
  const statusParam = searchParams.get('status')
  const limit       = Math.min(parseInt(searchParams.get('limit') ?? '200', 10) || 200, 500)

  if (statusParam && !VALID_STATUSES.has(statusParam) && statusParam !== 'active') {
    return NextResponse.json({ success: false, error: 'Estado inválido' }, { status: 400 })
  }

  // 3. Status filter
  const activeFilter = {
    kitchen_status: { in: ['NUEVO', 'PREP', 'LISTO'] as KitchenStatus[] },
    payment_status: { not: 'CANCELLED' as PaymentStatus },
  }
  const singleFilter = { kitchen_status: statusParam as KitchenStatus }
  const statusWhere  = !statusParam || statusParam === 'active' ? activeFilter : singleFilter

  // 4. Zone filter: admin sin restricción, resto via VenueUser → VenueZone → zone_ids
  let allowedZoneIds: number[] | null = null
  let myVenueId: number | null = null

  if (userRole !== 'admin') {
    const venueUser = await prisma.venueUser.findFirst({
      where:  { user_id: userId },
      select: { venue_id: true },
    })
    myVenueId = venueUser?.venue_id ?? null

    if (myVenueId !== null) {
      const venueZones = await prisma.venueZone.findMany({
        where:  { venue_id: myVenueId },
        select: { zone_id: true },
      })
      // Venue con zonas asignadas → filtrar; sin zonas → ver todo (evitar pantalla vacía)
      if (venueZones.length > 0) {
        allowedZoneIds = venueZones.map((vz) => vz.zone_id)
      }
    }
    // Sin venue asignado → ver todo (allowedZoneIds permanece null)
  }

  // 5. Fetch orders
  try {
    const zoneWhere = allowedZoneIds !== null ? { zone_id: { in: allowedZoneIds } } : {}

    const orders = await prisma.order.findMany({
      where:   { ...statusWhere, ...zoneWhere },
      include: {
        items: {
          include: { product: { select: { id: true, name: true, category: true } } },
          orderBy: { id: 'asc' },
        },
        user: { select: { code: true, name: true } },
      },
      orderBy: { created_at: 'asc' },
      take:    limit,
    })

    return NextResponse.json({ success: true, orders, myVenueId })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al obtener comandas KDS' }, { status: 500 })
  }
}
