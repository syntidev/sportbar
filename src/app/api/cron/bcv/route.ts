import { NextRequest, NextResponse } from 'next/server'
import { fetchAndStore, fetchAndStoreEuro } from '@/lib/dollar-rate'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const [usd, eur] = await Promise.allSettled([
    fetchAndStore(),
    fetchAndStoreEuro(),
  ])

  const usdResult = usd.status === 'fulfilled' ? usd.value : { success: false, error: String(usd.reason) }
  const eurResult = eur.status === 'fulfilled' ? eur.value : { success: false, error: String(eur.reason) }

  return NextResponse.json({
    success:    usdResult.success || eurResult.success,
    usd:        usdResult,
    eur:        eurResult,
    fetched_at: new Date().toISOString(),
  })
}
