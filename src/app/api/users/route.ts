import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import type { Role } from '@/types'

const ROLE_PREFIX: Record<Role, string> = {
  mesero:    'USR',
  cocina:    'COC',
  bar:       'BAR',
  despacho:  'DES',
  validador: 'VAL',
  admin:     'ADM',
}

const TelefonoVE = z
  .string()
  .regex(/^(04\d{9}|58\d{10})$/, 'Teléfono inválido. Formato: 04XXXXXXXXX o 58XXXXXXXXXX')

const CreateUserSchema = z.object({
  name:      z.string().trim().min(1).max(100),
  lastname:  z.string().trim().min(1).max(100),
  role:      z.enum(['mesero', 'cocina', 'bar', 'despacho', 'validador', 'admin']),
  pin:       z.string().regex(/^\d{4}$/, 'El PIN debe ser exactamente 4 dígitos'),
  cedula:    z.string().trim().regex(/^[VEve]?\d{6,8}$/, 'Cédula inválida').optional(),
  telefono:  TelefonoVE.optional(),
  venue_id:  z.number().int().positive().optional(),
})

async function generateCode(role: Role): Promise<string> {
  const prefix = ROLE_PREFIX[role]
  const last = await prisma.user.findFirst({
    where: { code: { startsWith: prefix + '-' } },
    orderBy: { code: 'desc' },
    select: { code: true },
  })
  const next = last ? parseInt(last.code.split('-')[1], 10) + 1 : 1
  return `${prefix}-${String(next).padStart(3, '0')}`
}

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        lastname: true,
        role: true,
        cedula: true,
        telefono: true,
        is_active: true,
        created_at: true,
        venue: { select: { id: true, name: true } },
      },
      orderBy: [{ role: 'asc' }, { code: 'asc' }],
    })
    return NextResponse.json({ success: true, users })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al obtener usuarios' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = CreateUserSchema.safeParse(body)

    if (!result.success) {
      const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
      return NextResponse.json({ success: false, errors }, { status: 400 })
    }

    const { name, lastname, role, pin, cedula, telefono, venue_id } = result.data

    const [hashedPin, code] = await Promise.all([
      bcrypt.hash(pin, 10),
      generateCode(role),
    ])

    const user = await prisma.user.create({
      data: { code, name, lastname, role, pin: hashedPin, cedula, telefono, venue_id },
      select: {
        id: true, code: true, name: true, lastname: true, role: true,
        cedula: true, telefono: true, is_active: true,
        venue: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ success: true, user }, { status: 201 })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al crear usuario' }, { status: 500 })
  }
}
