import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

// VenuePaymentMethod.method is a free String (not FK to PaymentMethod table)

function getSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET ?? '')
}

async function requireAdmin(req: NextRequest): Promise<{ id: number } | NextResponse> {
  const token = req.cookies.get('cafeball_session')?.value
  if (!token) return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (payload['role'] !== 'admin') {
      return NextResponse.json({ success: false, error: 'Sin permisos' }, { status: 403 })
    }
    return { id: payload['id'] as number }
  } catch {
    return NextResponse.json({ success: false, error: 'Sesión inválida' }, { status: 401 })
  }
}

const CreateSchema = z.object({
  method:    z.string().trim().min(1).max(80),
  is_active: z.boolean().default(true),
})

const ToggleSchema = z.object({
  method:    z.string().trim().min(1),
  is_active: z.boolean(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth
  const venueId = parseInt(params.id, 10)
  if (isNaN(venueId)) return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 })
  try {
    const venue = await prisma.venue.findUnique({ where: { id: venueId } })
    if (!venue) return NextResponse.json({ success: false, error: 'Venue no encontrado' }, { status: 404 })
    const methods = await prisma.venuePaymentMethod.findMany({
      where:   { venue_id: venueId },
      orderBy: { method: 'asc' },
    })
    return NextResponse.json({ success: true, methods })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al obtener métodos de pago' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth
  const venueId = parseInt(params.id, 10)
  if (isNaN(venueId)) return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 })
  try {
    const body = await req.json()
    const result = CreateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.issues.map((i) => i.message) },
        { status: 400 },
      )
    }
    const venue = await prisma.venue.findUnique({ where: { id: venueId } })
    if (!venue) return NextResponse.json({ success: false, error: 'Venue no encontrado' }, { status: 404 })
    const pm = await prisma.venuePaymentMethod.upsert({
      where:  { venue_id_method: { venue_id: venueId, method: result.data.method } },
      create: { venue_id: venueId, method: result.data.method, is_active: result.data.is_active },
      update: {},
    })
    return NextResponse.json({ success: true, method: pm }, { status: 201 })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al crear método de pago' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth
  const venueId = parseInt(params.id, 10)
  if (isNaN(venueId)) return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 })
  try {
    const body = await req.json()
    const result = ToggleSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.issues.map((i) => i.message) },
        { status: 400 },
      )
    }
    const pm = await prisma.venuePaymentMethod.update({
      where: { venue_id_method: { venue_id: venueId, method: result.data.method } },
      data:  { is_active: result.data.is_active },
    })
    return NextResponse.json({ success: true, method: pm })
  } catch (err) {
    const code = (err as { code?: string }).code
    if (code === 'P2025') return NextResponse.json({ success: false, error: 'Método no encontrado en este venue' }, { status: 404 })
    return NextResponse.json({ success: false, error: 'Error al actualizar método de pago' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth
  const venueId = parseInt(params.id, 10)
  if (isNaN(venueId)) return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 })
  const method = req.nextUrl.searchParams.get('method')
  if (!method) return NextResponse.json({ success: false, error: 'method requerido en query' }, { status: 400 })
  try {
    const deleted = await prisma.venuePaymentMethod.deleteMany({
      where: { venue_id: venueId, method },
    })
    if (deleted.count === 0) {
      return NextResponse.json({ success: false, error: 'Método no encontrado en este venue' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al eliminar método de pago' }, { status: 500 })
  }
}
