import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const COOKIE_NAME = 'cafeball_session'
const COOKIE_MAX_AGE = 60 * 60 * 12 // 12 horas

const ipAttempts = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const data = ipAttempts.get(ip)
  if (!data || data.resetAt < now) {
    ipAttempts.set(ip, { count: 1, resetAt: now + 60_000 })
    return false
  }
  if (data.count >= 5) return true
  data.count++
  return false
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET no definido')
  return new TextEncoder().encode(secret)
}

const LoginSchema = z.object({
  code: z.string().min(1),
  pin:  z.string().regex(/^\d{4}$/, 'PIN debe ser 4 dígitos'),
})

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    '127.0.0.1'

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { success: false, error: 'Demasiados intentos. Espera un minuto.' },
      { status: 429 },
    )
  }

  try {
    const body = await req.json()
    const result = LoginSchema.safeParse(body)

    if (!result.success) {
      const errors = result.error.issues.map((i) => i.message)
      return NextResponse.json({ success: false, errors }, { status: 400 })
    }

    const { code, pin } = result.data

    const user = await prisma.user.findUnique({
      where: { code: code.trim().toUpperCase(), is_active: true },
      select: { id: true, code: true, name: true, lastname: true, role: true, pin: true },
    })

    if (!user) {
      return NextResponse.json({ success: false, error: 'Credenciales inválidas' }, { status: 401 })
    }

    const valid = await bcrypt.compare(pin, user.pin)
    if (!valid) {
      return NextResponse.json({ success: false, error: 'Credenciales inválidas' }, { status: 401 })
    }

    const token = await new SignJWT({ id: user.id, code: user.code, role: user.role })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('12h')
      .sign(getSecret())

    const { pin: _pin, ...safeUser } = user

    const res = NextResponse.json({ success: true, user: safeUser })
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    })

    return res
  } catch {
    return NextResponse.json({ success: false, error: 'Error del servidor' }, { status: 500 })
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true })
  res.cookies.delete(COOKIE_NAME)
  return res
}
