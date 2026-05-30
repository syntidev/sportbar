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
    const venueUsers = await prisma.venueUser.findMany({
      where:   { venue_id: venueId },
      include: {
        user: {
          select: { id: true, code: true, name: true, lastname: true, role: true, is_active: true, cedula: true },
        },
      },
      orderBy: { user: { name: 'asc' } },
    })
    return NextResponse.json({ success: true, users: venueUsers.map((vu) => vu.user) })
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
    await prisma.venueUser.upsert({
      where:  { venue_id_user_id: { venue_id: venueId, user_id: result.data.user_id } },
      create: { venue_id: venueId, user_id: result.data.user_id },
      update: {},
    })
    return NextResponse.json({
      success: true,
      user: { id: user.id, code: user.code, name: user.name, lastname: user.lastname, role: user.role, is_active: user.is_active },
    })
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
    const deleted = await prisma.venueUser.deleteMany({
      where: { venue_id: venueId, user_id: userId },
    })
    if (deleted.count === 0) {
      return NextResponse.json({ success: false, error: 'Asignación no encontrada' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al desasignar usuario' }, { status: 500 })
  }
}
