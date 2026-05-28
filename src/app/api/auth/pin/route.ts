import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const { code, pin } = await req.json()

    if (!code || !pin) {
      return NextResponse.json({ success: false, error: 'Codigo y PIN requeridos' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { code, is_active: true } })

    if (!user) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 })
    }

    const valid = await bcrypt.compare(pin, user.pin)

    if (!valid) {
      return NextResponse.json({ success: false, error: 'PIN incorrecto' }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      user: { id: user.id, code: user.code, name: user.name, lastname: user.lastname, role: user.role },
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Error del servidor' }, { status: 500 })
  }
}

