import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const FALLBACK_RATE = 50.0

export async function GET() {
  try {
    const row = await prisma.dollarRate.findFirst({
      where:   { is_active: true },
      orderBy: { effective_from: 'desc' },
      select:  { rate: true, source: true, effective_from: true },
    })
    const rate = row ? Number(row.rate) : FALLBACK_RATE
    return NextResponse.json({
      success:    true,
      rate,
      source:     row?.source    ?? 'fallback',
      updated_at: row?.effective_from?.toISOString() ?? null,
    })
  } catch {
    return NextResponse.json({ success: false, rate: FALLBACK_RATE })
  }
}
