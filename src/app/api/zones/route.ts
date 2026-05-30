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

const CreateZoneSchema = z.object({
  name:      z.string().trim().min(1).max(80),
  color:     z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#22c55e'),
  capacity:  z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
})

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth
  try {
    const zones = await prisma.zone.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { venueZones: true, orders: true } } },
    })
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
    const zone = await prisma.zone.create({ data: result.data })
    return NextResponse.json({ success: true, zone }, { status: 201 })
  } catch (err) {
    const isUnique = (err as { code?: string }).code === 'P2002'
    return NextResponse.json(
      { success: false, error: isUnique ? 'Ya existe una zona con ese nombre' : 'Error al crear zona' },
      { status: isUnique ? 409 : 500 },
    )
  }
}
