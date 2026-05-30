import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const CONFIG_KEY = 'zones'

interface ZoneEntry {
  id:          number
  name:        string
  description: string
  color:       string
  is_active:   boolean
}

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

async function readZones(): Promise<ZoneEntry[]> {
  const row = await prisma.config.findUnique({ where: { key: CONFIG_KEY } })
  if (!row) return []
  try { return JSON.parse(row.value) as ZoneEntry[] } catch { return [] }
}

async function writeZones(zones: ZoneEntry[]): Promise<void> {
  await prisma.config.upsert({
    where:  { key: CONFIG_KEY },
    create: { key: CONFIG_KEY, value: JSON.stringify(zones) },
    update: { value: JSON.stringify(zones) },
  })
}

const UpdateZoneSchema = z.object({
  name:        z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(200).optional(),
  color:       z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  is_active:   z.boolean().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth
  const id = parseInt(params.id, 10)
  if (isNaN(id)) return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 })
  try {
    const zones = await readZones()
    const zone = zones.find((z) => z.id === id)
    if (!zone) return NextResponse.json({ success: false, error: 'Zona no encontrada' }, { status: 404 })
    return NextResponse.json({ success: true, zone })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al obtener zona' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth
  const id = parseInt(params.id, 10)
  if (isNaN(id)) return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 })
  try {
    const body = await req.json()
    const result = UpdateZoneSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) },
        { status: 400 },
      )
    }
    const zones = await readZones()
    const idx = zones.findIndex((z) => z.id === id)
    if (idx === -1) return NextResponse.json({ success: false, error: 'Zona no encontrada' }, { status: 404 })
    zones[idx] = { ...zones[idx], ...result.data }
    await writeZones(zones)
    return NextResponse.json({ success: true, zone: zones[idx] })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al actualizar zona' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth
  const id = parseInt(params.id, 10)
  if (isNaN(id)) return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 })
  try {
    const zones = await readZones()
    const idx = zones.findIndex((z) => z.id === id)
    if (idx === -1) return NextResponse.json({ success: false, error: 'Zona no encontrada' }, { status: 404 })
    await writeZones(zones.filter((z) => z.id !== id))
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al eliminar zona' }, { status: 500 })
  }
}
