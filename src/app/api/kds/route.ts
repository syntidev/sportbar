import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'
import type { KitchenStatus, PaymentStatus } from '@/types'

// ── Auth ──────────────────────────────────────────────────────────────────────

const COOKIE_NAME = 'cafeball_session'

function getSecret(): Uint8Array {
  return new TextEncoder().encode(process.env.JWT_SECRET ?? '')
}

// ── Capability → category mapping ─────────────────────────────────────────────
// Venue.capabilities es string[] almacenado como Json.
// Cada capability desbloquea categorías de producto visibles en ese KDS.

const CAP_TO_CATEGORIES: Record<string, string[]> = {
  comida:       ['hamburguesas', 'raciones'],
  cerveza:      ['bebidas'],
  licor_fuerte: ['bebidas'],          // licor_fuerte también es categoría 'bebidas' en DB
}

// Fallback por rol cuando el usuario no tiene venue asignado
const ROLE_FALLBACK: Partial<Record<string, string[]>> = {
  cocina:    ['hamburguesas', 'raciones'],
  bar:       ['bebidas'],
  despacho:  null as unknown as string[],  // ve todo
  mesero:    null as unknown as string[],  // ve todo
}

// ── GET /api/kds ──────────────────────────────────────────────────────────────

const VALID_STATUSES = new Set<string>(['NUEVO', 'PREP', 'LISTO', 'ENTREGADO'])

export async function GET(req: NextRequest) {
  // 1. Verificar sesión
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) {
    return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
  }

  let userId: number
  let userRole: string
  try {
    const { payload } = await jwtVerify(token, getSecret())
    userId   = Number(payload['id'])
    userRole = String(payload['role'])
  } catch {
    return NextResponse.json({ success: false, error: 'Sesión inválida' }, { status: 401 })
  }

  // 2. Parámetros de query
  const { searchParams } = new URL(req.url)
  const statusParam = searchParams.get('status')
  const limit       = Math.min(parseInt(searchParams.get('limit') ?? '200', 10) || 200, 500)

  if (statusParam && !VALID_STATUSES.has(statusParam) && statusParam !== 'active') {
    return NextResponse.json({ success: false, error: 'Estado inválido' }, { status: 400 })
  }

  // 3. Construir filtro de kitchen_status
  const activeFilter = {
    kitchen_status: { in: ['NUEVO', 'PREP', 'LISTO'] as KitchenStatus[] },
    payment_status: { not: 'CANCELLED' as PaymentStatus },
  }
  const singleFilter = {
    kitchen_status: statusParam as KitchenStatus,
  }
  const statusWhere = (!statusParam || statusParam === 'active') ? activeFilter : singleFilter

  // 4. Determinar categorías permitidas según venue del usuario
  //    Admin ve todo sin filtro (allowedCategories === null)
  let allowedCategories: string[] | null = null
  let myVenueId: number | null = null

  if (userRole !== 'admin') {
    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: { venue_id: true },
    })

    myVenueId = user?.venue_id ?? null

    if (user?.venue_id) {
      // Tiene venue asignado → leer capabilities
      const venue = await prisma.venue.findUnique({
        where:  { id: user.venue_id },
        select: { capabilities: true },
      })

      const caps = Array.isArray(venue?.capabilities)
        ? (venue.capabilities as string[])
        : []

      const cats = new Set<string>()
      for (const cap of caps) {
        for (const cat of (CAP_TO_CATEGORIES[cap] ?? [])) {
          cats.add(cat)
        }
      }

      // Si la venue no tiene ninguna capability conocida → mostrar todo
      // (evitar que un venue mal configurado quede con lista vacía)
      allowedCategories = cats.size > 0 ? Array.from(cats) : null
    } else {
      // Sin venue → fallback por rol
      const fallback = ROLE_FALLBACK[userRole]
      allowedCategories = fallback ?? null
    }
  }

  // 5. Fetch órdenes
  try {
    const orders = await prisma.order.findMany({
      where:   statusWhere,
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, category: true } },
          },
          orderBy: { id: 'asc' },
        },
        user: { select: { code: true, name: true } },
      },
      orderBy: { created_at: 'asc' },
      take:    limit,
    })

    // 6. Filtrar items por categorías permitidas
    //    Si allowedCategories === null → sin filtro (ve todo)
    const result =
      allowedCategories !== null
        ? orders
            .map((o) => ({
              ...o,
              items: o.items.filter((i) =>
                (allowedCategories as string[]).includes(i.product.category),
              ),
            }))
            .filter((o) => o.items.length > 0)
        : orders

    return NextResponse.json({ success: true, orders: result, myVenueId })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Error al obtener comandas KDS' },
      { status: 500 },
    )
  }
}
