import { prisma } from './prisma'
import { fetchUSD, fetchEUR } from './currency-fetcher'

const CACHE_TTL      = 3_600_000  // 1 h
const MAX_CHANGE_PCT = 60.0
const FALLBACK_RATE  = Number(process.env.DOLLAR_FALLBACK_RATE ?? '40.00')

// ── Cache en memoria (Map — no Redis, single-process PM2) ─────────────────────

interface CacheEntry { rate: number; at: number }
const cache = new Map<string, CacheEntry>()

function getCached(currency: string): number | null {
  const e = cache.get(currency)
  if (!e) return null
  if (Date.now() - e.at > CACHE_TTL) { cache.delete(currency); return null }
  return e.rate
}

function setCached(currency: string, rate: number) {
  cache.set(currency, { rate, at: Date.now() })
}

function invalidateCache(currency: string) {
  cache.delete(currency)
}

// ── Lectores de DB ────────────────────────────────────────────────────────────

export async function getCurrentRate(_source = 'bcv'): Promise<number> {
  const hit = getCached('USD')
  if (hit !== null) return hit

  try {
    const row = await prisma.dollarRate.findFirst({
      where:   { is_active: true, currency_type: 'USD' },
      orderBy: { effective_from: 'desc' },
      select:  { rate: true },
    })
    const rate = row ? Number(row.rate) : FALLBACK_RATE
    if (Number.isFinite(rate) && rate > 0) { setCached('USD', rate); return rate }
  } catch { /* fallthrough */ }

  return FALLBACK_RATE
}

export async function getCurrentEuroRate(): Promise<number> {
  const hit = getCached('EUR')
  if (hit !== null) return hit

  try {
    const row = await prisma.dollarRate.findFirst({
      where:   { is_active: true, currency_type: 'EUR' },
      orderBy: { effective_from: 'desc' },
      select:  { rate: true },
    })
    const rate = row ? Number(row.rate) : FALLBACK_RATE
    if (Number.isFinite(rate) && rate > 0) { setCached('EUR', rate); return rate }
  } catch { /* fallthrough */ }

  return FALLBACK_RATE
}

// ── Fetch + store ─────────────────────────────────────────────────────────────

export async function fetchAndStore(): Promise<{ success: boolean; rate: number; source: string; error?: string }> {
  const fetched = await fetchUSD()
  if (!fetched.success) return { success: false, rate: FALLBACK_RATE, source: 'all_failed', error: 'Todas las fuentes fallaron' }

  // Validar cambio excesivo contra el último valor real en DB
  const existing = await prisma.dollarRate.findFirst({
    where:   { is_active: true, currency_type: 'USD' },
    orderBy: { effective_from: 'desc' },
    select:  { rate: true },
  })
  if (existing) {
    const prev       = Number(existing.rate)
    const changePct  = Math.abs((fetched.rate - prev) / prev) * 100
    if (changePct > MAX_CHANGE_PCT) {
      return { success: false, rate: prev, source: 'rejected', error: `Cambio ${changePct.toFixed(1)}% supera límite ${MAX_CHANGE_PCT}%` }
    }
  }

  const now = new Date()
  await prisma.$transaction([
    prisma.dollarRate.updateMany({
      where: { is_active: true, currency_type: 'USD' },
      data:  { is_active: false, effective_until: now },
    }),
    prisma.dollarRate.create({
      data: { rate: fetched.rate, source: fetched.source, currency_type: 'USD', is_active: true, effective_from: now },
    }),
  ])

  invalidateCache('USD')
  return { success: true, rate: fetched.rate, source: fetched.source }
}

export async function fetchAndStoreEuro(): Promise<{ success: boolean; rate: number; source: string; error?: string }> {
  const fetched = await fetchEUR()
  if (!fetched.success) return { success: false, rate: FALLBACK_RATE, source: 'all_failed', error: 'Todas las fuentes fallaron' }

  const existing = await prisma.dollarRate.findFirst({
    where:   { is_active: true, currency_type: 'EUR' },
    orderBy: { effective_from: 'desc' },
    select:  { rate: true },
  })
  if (existing) {
    const prev      = Number(existing.rate)
    const changePct = Math.abs((fetched.rate - prev) / prev) * 100
    if (changePct > MAX_CHANGE_PCT) {
      return { success: false, rate: prev, source: 'rejected', error: `Cambio ${changePct.toFixed(1)}% supera límite ${MAX_CHANGE_PCT}%` }
    }
  }

  const now = new Date()
  await prisma.$transaction([
    prisma.dollarRate.updateMany({
      where: { is_active: true, currency_type: 'EUR' },
      data:  { is_active: false, effective_until: now },
    }),
    prisma.dollarRate.create({
      data: { rate: fetched.rate, source: fetched.source, currency_type: 'EUR', is_active: true, effective_from: now },
    }),
  ])

  invalidateCache('EUR')
  return { success: true, rate: fetched.rate, source: fetched.source }
}

export async function storeManualRate(rate: number, currency = 'USD'): Promise<void> {
  const now = new Date()
  await prisma.$transaction([
    prisma.dollarRate.updateMany({
      where: { is_active: true, currency_type: currency },
      data:  { is_active: false, effective_until: now },
    }),
    prisma.dollarRate.create({
      data: { rate, source: 'manual', currency_type: currency, is_active: true, effective_from: now },
    }),
  ])
  invalidateCache(currency)
}

export async function isStale(hours = 4): Promise<boolean> {
  try {
    const row = await prisma.dollarRate.findFirst({
      where:   { is_active: true, currency_type: 'USD' },
      orderBy: { effective_from: 'desc' },
      select:  { effective_from: true },
    })
    if (!row) return true
    return Date.now() - row.effective_from.getTime() > hours * 3_600_000
  } catch {
    return true
  }
}

export async function getHistoricalRates(days = 30): Promise<Array<{ rate: number; source: string; currency_type: string; created_at: Date }>> {
  const since = new Date(Date.now() - days * 86_400_000)
  const rows  = await prisma.dollarRate.findMany({
    where:   { created_at: { gte: since } },
    orderBy: { created_at: 'asc' },
    select:  { rate: true, source: true, currency_type: true, created_at: true },
  })
  return rows.map((r) => ({ ...r, rate: Number(r.rate) }))
}

// ── Utilidades de formato ─────────────────────────────────────────────────────

export function calcBs(price_usd: number, rate: number): number {
  return Math.round(price_usd * rate * 100) / 100
}

export function formatRef(amount: number): string {
  return 'REF ' + Number(amount).toFixed(2)
}

export function formatBs(amount: number): string {
  return 'Bs. ' + Number(amount).toLocaleString('es-VE', { minimumFractionDigits: 2 })
}
