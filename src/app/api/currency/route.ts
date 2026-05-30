import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  getCurrentRate,
  getCurrentEuroRate,
  fetchAndStore,
  fetchAndStoreEuro,
  isStale,
} from '@/lib/dollar-rate'

const FALLBACK_RATE = Number(process.env.DOLLAR_FALLBACK_RATE ?? '40.00')

export async function GET() {
  try {
    const [usd, eur, stale] = await Promise.all([
      getCurrentRate(),
      getCurrentEuroRate(),
      isStale(1),
    ])

    // Auto-refresh en background si la tasa tiene más de 1 hora
    if (stale) {
      void fetchAndStore().catch(() => {})
      void fetchAndStoreEuro().catch(() => {})
    }

    const lastRow = await prisma.dollarRate.findFirst({
      where:   { is_active: true, currency_type: 'USD' },
      orderBy: { effective_from: 'desc' },
      select:  { effective_from: true, source: true },
    })

    return NextResponse.json({
      success:     true,
      usd,
      eur,
      rate:        usd,   // backward-compat (menu/page.tsx usa rData.rate)
      last_update: lastRow?.effective_from?.toISOString() ?? null,
      source:      lastRow?.source ?? 'fallback',
      is_stale:    stale,
    })
  } catch {
    return NextResponse.json({ success: false, rate: FALLBACK_RATE, usd: FALLBACK_RATE, eur: FALLBACK_RATE })
  }
}
