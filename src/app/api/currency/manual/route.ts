import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const Schema = z.object({
  rate: z.number().positive().max(100_000),
})

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json()
    const result = Schema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.issues.map((i) => i.message) },
        { status: 400 },
      )
    }
    const { rate } = result.data
    const now = new Date()

    await prisma.$transaction([
      prisma.dollarRate.updateMany({
        where: { is_active: true },
        data:  { is_active: false, effective_until: now },
      }),
      prisma.dollarRate.create({
        data: { rate, source: 'manual', is_active: true, effective_from: now },
      }),
    ])

    return NextResponse.json({ success: true, rate, updated_at: now.toISOString() })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al actualizar tasa' }, { status: 500 })
  }
}
