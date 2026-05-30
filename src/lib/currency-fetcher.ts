export interface FetchResult {
  success: boolean
  rate:    number
  source:  'bcv' | 'all_failed'
}

const TIMEOUT_MS = 8000

function safeFetch(url: string, ms = TIMEOUT_MS): Promise<Response> {
  return fetch(url, {
    signal:  AbortSignal.timeout(ms),
    headers: { Accept: 'application/json' },
    cache:   'no-store',
  })
}

function valid(rate: unknown): rate is number {
  return typeof rate === 'number' && rate > 10 && rate < 10_000
}

// ── USD ────────────────────────────────────────────────────────────────���──────

export async function fetchUSD(): Promise<FetchResult> {
  // Fuente 1: dolarapi oficial
  try {
    const res  = await safeFetch('https://ve.dolarapi.com/v1/dolares/oficial')
    if (res.ok) {
      const data = await res.json() as { promedio?: unknown }
      if (valid(data.promedio)) return { success: true, rate: data.promedio, source: 'bcv' }
    }
  } catch { /* fall through */ }

  // Fuente 2: brecha-cambiaria
  try {
    const res  = await safeFetch('https://brecha-cambiaria.com/api/prices', 5000)
    if (res.ok) {
      const data = await res.json() as { bcv_usd?: unknown }
      if (valid(data.bcv_usd)) return { success: true, rate: data.bcv_usd as number, source: 'bcv' }
    }
  } catch { /* fall through */ }

  return { success: false, rate: 0, source: 'all_failed' }
}

// ── EUR ───────────────────────────────────────────────────────────────────────

export async function fetchEUR(): Promise<FetchResult> {
  // Fuente 1: dolarapi array — buscar fuente='euro'
  try {
    const res  = await safeFetch('https://ve.dolarapi.com/v1/dolares')
    if (res.ok) {
      const data = await res.json() as Array<{ fuente?: string; promedio?: unknown }>
      const entry = Array.isArray(data) ? data.find((d) => d.fuente === 'euro') : undefined
      if (entry && valid(entry.promedio)) return { success: true, rate: entry.promedio as number, source: 'bcv' }
    }
  } catch { /* fall through */ }

  // Fuente 2: brecha-cambiaria
  try {
    const res  = await safeFetch('https://brecha-cambiaria.com/api/prices', 5000)
    if (res.ok) {
      const data = await res.json() as { bcv_eur?: unknown }
      if (valid(data.bcv_eur)) return { success: true, rate: data.bcv_eur as number, source: 'bcv' }
    }
  } catch { /* fall through */ }

  return { success: false, rate: 0, source: 'all_failed' }
}
