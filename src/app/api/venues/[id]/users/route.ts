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

const AssignSchema = z.object({ user_id: z.number().int().positive() })

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
    const users = await prisma.user.findMany({
      where:   { venue_id: venueId },
      select:  { id: true, code: true, name: true, lastname: true, role: true, is_active: true, cedula: true },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    })
    return NextResponse.json({ success: true, users })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al obtener usuarios del venue' }, { status: 500 })
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
    const [venue, user] = await Promise.all([
      prisma.venue.findUnique({ where: { id: venueId } }),
      prisma.user.findUnique({ where: { id: result.data.user_id } }),
    ])
    if (!venue) return NextResponse.json({ success: false, error: 'Venue no encontrado' }, { status: 404 })
    if (!user)  return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 })
    const updated = await prisma.user.update({
      where:  { id: result.data.user_id },
      data:   { venue_id: venueId },
      select: { id: true, code: true, name: true, lastname: true, role: true, is_active: true },
    })
    return NextResponse.json({ success: true, user: updated })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al asignar usuario' }, { status: 500 })
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
  const userId = parseInt(req.nextUrl.searchParams.get('user_id') ?? '', 10)
  if (isNaN(userId)) return NextResponse.json({ success: false, error: 'user_id requerido en query' }, { status: 400 })
  try {
    const user = await prisma.user.findUnique({ where: { id: userId, venue_id: venueId } })
    if (!user) return NextResponse.json({ success: false, error: 'Usuario no pertenece a este venue' }, { status: 404 })
    await prisma.user.update({ where: { id: userId }, data: { venue_id: null } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al desasignar usuario' }, { status: 500 })
  }
}
