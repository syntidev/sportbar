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

const UpdateZoneSchema = z.object({
  name:      z.string().trim().min(1).max(80).optional(),
  color:     z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  capacity:  z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
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
    const zone = await prisma.zone.findUnique({
      where:   { id },
      include: { _count: { select: { venueZones: true, orders: true } } },
    })
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
    const zone = await prisma.zone.update({ where: { id }, data: result.data })
    return NextResponse.json({ success: true, zone })
  } catch (err) {
    const code = (err as { code?: string }).code
    if (code === 'P2025') return NextResponse.json({ success: false, error: 'Zona no encontrada' }, { status: 404 })
    if (code === 'P2002') return NextResponse.json({ success: false, error: 'Ya existe una zona con ese nombre' }, { status: 409 })
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
    await prisma.zone.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    const code = (err as { code?: string }).code
    if (code === 'P2025') return NextResponse.json({ success: false, error: 'Zona no encontrada' }, { status: 404 })
    if (code === 'P2003') return NextResponse.json({ success: false, error: 'Zona tiene órdenes asociadas' }, { status: 409 })
    return NextResponse.json({ success: false, error: 'Error al eliminar zona' }, { status: 500 })
  }
}
