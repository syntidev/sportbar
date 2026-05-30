import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

// Venue payment method assignments stored in config table
// key = "venue_pm_{venueId}", value = JSON array of { pm_id: number, is_active: boolean }[]
// Global PaymentMethod records are shared; per-venue is_active overrides the assignment status.

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

interface VenuePmEntry { pm_id: number; is_active: boolean }

function configKey(venueId: number) { return `venue_pm_${venueId}` }

async function readAssigned(venueId: number): Promise<VenuePmEntry[]> {
  const row = await prisma.config.findUnique({ where: { key: configKey(venueId) } })
  if (!row) return []
  try { return JSON.parse(row.value) as VenuePmEntry[] } catch { return [] }
}

async function writeAssigned(venueId: number, entries: VenuePmEntry[]): Promise<void> {
  await prisma.config.upsert({
    where:  { key: configKey(venueId) },
    create: { key: configKey(venueId), value: JSON.stringify(entries) },
    update: { value: JSON.stringify(entries) },
  })
}

const AssignSchema  = z.object({ payment_method_id: z.number().int().positive() })
const ToggleSchema  = z.object({ payment_method_id: z.number().int().positive(), is_active: z.boolean() })

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth
  const venueId = parseInt(params.id, 10)
  if (isNaN(venueId)) return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 })
  try {
    const [venue, allMethods, assigned] = await Promise.all([
      prisma.venue.findUnique({ where: { id: venueId } }),
      prisma.paymentMethod.findMany({ orderBy: [{ sort_order: 'asc' }, { name: 'asc' }] }),
      readAssigned(venueId),
    ])
    if (!venue) return NextResponse.json({ success: false, error: 'Venue no encontrado' }, { status: 404 })
    const assignedMap = new Map(assigned.map((e) => [e.pm_id, e.is_active]))
    const methods = allMethods.map((m) => ({
      ...m,
      venue_assigned: assignedMap.has(m.id),
      venue_active:   assignedMap.get(m.id) ?? false,
    }))
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
    const result = AssignSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.issues.map((i) => i.message) },
        { status: 400 },
      )
    }
    const [venue, pm] = await Promise.all([
      prisma.venue.findUnique({ where: { id: venueId } }),
      prisma.paymentMethod.findUnique({ where: { id: result.data.payment_method_id } }),
    ])
    if (!venue) return NextResponse.json({ success: false, error: 'Venue no encontrado' }, { status: 404 })
    if (!pm)    return NextResponse.json({ success: false, error: 'Método de pago no encontrado' }, { status: 404 })
    const assigned = await readAssigned(venueId)
    if (!assigned.some((e) => e.pm_id === result.data.payment_method_id)) {
      await writeAssigned(venueId, [...assigned, { pm_id: result.data.payment_method_id, is_active: true }])
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al asignar método de pago' }, { status: 500 })
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
    const assigned = await readAssigned(venueId)
    const idx = assigned.findIndex((e) => e.pm_id === result.data.payment_method_id)
    if (idx === -1) {
      return NextResponse.json({ success: false, error: 'Método no asignado a este venue' }, { status: 404 })
    }
    assigned[idx].is_active = result.data.is_active
    await writeAssigned(venueId, assigned)
    return NextResponse.json({ success: true, entry: assigned[idx] })
  } catch {
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
  const pmId = parseInt(req.nextUrl.searchParams.get('payment_method_id') ?? '', 10)
  if (isNaN(pmId)) return NextResponse.json({ success: false, error: 'payment_method_id requerido en query' }, { status: 400 })
  try {
    const assigned = await readAssigned(venueId)
    const updated = assigned.filter((e) => e.pm_id !== pmId)
    if (updated.length === assigned.length) {
      return NextResponse.json({ success: false, error: 'Método no asignado a este venue' }, { status: 404 })
    }
    await writeAssigned(venueId, updated)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al desasignar método de pago' }, { status: 500 })
  }
}
