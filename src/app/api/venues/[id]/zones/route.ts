import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

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

const AssignSchema = z.object({ zone_id: z.number().int().positive() })

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
    const venueZones = await prisma.venueZone.findMany({
      where:   { venue_id: venueId },
      include: { zone: true },
      orderBy: { zone: { name: 'asc' } },
    })
    return NextResponse.json({ success: true, zones: venueZones.map((vz) => vz.zone) })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al obtener zonas del venue' }, { status: 500 })
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
    const [venue, zone] = await Promise.all([
      prisma.venue.findUnique({ where: { id: venueId } }),
      prisma.zone.findUnique({ where: { id: result.data.zone_id } }),
    ])
    if (!venue) return NextResponse.json({ success: false, error: 'Venue no encontrado' }, { status: 404 })
    if (!zone)  return NextResponse.json({ success: false, error: 'Zona no encontrada' }, { status: 404 })
    await prisma.venueZone.upsert({
      where:  { venue_id_zone_id: { venue_id: venueId, zone_id: result.data.zone_id } },
      create: { venue_id: venueId, zone_id: result.data.zone_id },
      update: {},
    })
    return NextResponse.json({ success: true, zone })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al asignar zona' }, { status: 500 })
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
  const zoneId = parseInt(req.nextUrl.searchParams.get('zone_id') ?? '', 10)
  if (isNaN(zoneId)) return NextResponse.json({ success: false, error: 'zone_id requerido en query' }, { status: 400 })
  try {
    const deleted = await prisma.venueZone.deleteMany({
      where: { venue_id: venueId, zone_id: zoneId },
    })
    if (deleted.count === 0) {
      return NextResponse.json({ success: false, error: 'Asignación no encontrada' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al desasignar zona' }, { status: 500 })
  }
}
