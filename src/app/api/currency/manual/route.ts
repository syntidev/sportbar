import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { z } from 'zod'
import { storeManualRate } from '@/lib/dollar-rate'

const Schema = z.object({
  rate:     z.number().positive().max(100_000),
  currency: z.enum(['USD', 'EUR']).default('USD'),
})

async function isAdmin(): Promise<boolean> {
  const token = cookies().get('cafeball_session')?.value
  if (!token) return false
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET ?? ''),
    )
    return (payload as { role?: string }).role === 'admin'
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body   = await req.json()
    const result = Schema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.issues.map((i) => i.message) },
        { status: 400 },
      )
    }

    const { rate, currency } = result.data
    await storeManualRate(rate, currency)

    return NextResponse.json({ success: true, rate, currency, updated_at: new Date().toISOString() })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al actualizar tasa' }, { status: 500 })
  }
}
