import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

// Zones stored in config table, key = "zones", value = ZoneEntry[]

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

const CreateZoneSchema = z.object({
  name:        z.string().trim().min(1).max(80),
  description: z.string().trim().max(200).default(''),
  color:       z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#2E7D32'),
  is_active:   z.boolean().default(true),
})

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth
  try {
    const zones = await readZones()
    return NextResponse.json({ success: true, zones })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al obtener zonas' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await req.json()
    const result = CreateZoneSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) },
        { status: 400 },
      )
    }
    const zones = await readZones()
    const nextId = zones.length > 0 ? Math.max(...zones.map((z) => z.id)) + 1 : 1
    const newZone: ZoneEntry = { id: nextId, ...result.data }
    await writeZones([...zones, newZone])
    return NextResponse.json({ success: true, zone: newZone }, { status: 201 })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al crear zona' }, { status: 500 })
  }
}
