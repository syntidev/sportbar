import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// Zone assignments stored in Venue.zona_geografica as { assigned_zone_ids: number[] }
// Zone definitions live in config table key = "zones"

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

interface ZoneGeo { assigned_zone_ids: number[] }

function parseGeo(raw: Prisma.JsonValue | null): ZoneGeo {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { assigned_zone_ids: [] }
  const obj = raw as Record<string, unknown>
  if (!Array.isArray(obj['assigned_zone_ids'])) return { assigned_zone_ids: [] }
  return {
    assigned_zone_ids: (obj['assigned_zone_ids'] as unknown[]).filter(
      (x): x is number => typeof x === 'number',
    ),
  }
}

interface ZoneEntry {
  id:          number
  name:        string
  description: string
  color:       string
  is_active:   boolean
}

async function readAllZones(): Promise<ZoneEntry[]> {
  const row = await prisma.config.findUnique({ where: { key: 'zones' } })
  if (!row) return []
  try { return JSON.parse(row.value) as ZoneEntry[] } catch { return [] }
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
    const geo = parseGeo(venue.zona_geografica)
    const allZones = await readAllZones()
    const zones = allZones.filter((z) => geo.assigned_zone_ids.includes(z.id))
    return NextResponse.json({ success: true, zone_ids: geo.assigned_zone_ids, zones })
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
    const venue = await prisma.venue.findUnique({ where: { id: venueId } })
    if (!venue) return NextResponse.json({ success: false, error: 'Venue no encontrado' }, { status: 404 })
    const geo = parseGeo(venue.zona_geografica)
    if (!geo.assigned_zone_ids.includes(result.data.zone_id)) {
      geo.assigned_zone_ids.push(result.data.zone_id)
      await prisma.venue.update({
        where: { id: venueId },
        data:  { zona_geografica: geo as Prisma.InputJsonValue },
      })
    }
    return NextResponse.json({ success: true, zone_ids: geo.assigned_zone_ids })
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
    const venue = await prisma.venue.findUnique({ where: { id: venueId } })
    if (!venue) return NextResponse.json({ success: false, error: 'Venue no encontrado' }, { status: 404 })
    const geo = parseGeo(venue.zona_geografica)
    geo.assigned_zone_ids = geo.assigned_zone_ids.filter((id) => id !== zoneId)
    await prisma.venue.update({
      where: { id: venueId },
      data:  { zona_geografica: geo as Prisma.InputJsonValue },
    })
    return NextResponse.json({ success: true, zone_ids: geo.assigned_zone_ids })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al desasignar zona' }, { status: 500 })
  }
}
