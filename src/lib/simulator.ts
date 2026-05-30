import { prisma } from '@/lib/prisma'

// ── Types ──────────────────────────────────────────────────────────────────────

export type Intensity = 'tranquilo' | 'normal' | 'lleno' | 'sold_out'

interface Scenario {
  users:       number
  interval_ms: number
}

const SCENARIOS: Record<Intensity, Scenario> = {
  tranquilo: { users: 50,  interval_ms: 3 * 60 * 1000 },
  normal:    { users: 200, interval_ms: 90 * 1000      },
  lleno:     { users: 400, interval_ms: 45 * 1000      },
  sold_out:  { users: 700, interval_ms: 20 * 1000      },
}

// Valores válidos del legacy ZoneCode enum — el API de órdenes los exige
const ZONE_CODES = ['Norte', 'Sur', 'VIP', 'Externa'] as const
type ZoneCode = (typeof ZONE_CODES)[number]

interface SimProduct { id: number; name: string; price_usd: number }
interface SimVenue   { id: number; name: string }

export interface SimStatus {
  running:          boolean
  intensity:        Intensity | null
  started_at:       string | null
  ends_at:          string | null
  orders_created:   number
  orders_paid:      number
  orders_cancelled: number
  errors:           number
  avg_response_ms:  number
  p95_response_ms:  number
  orders_per_venue: Record<string, number>
}

// ── Singleton — válido en PM2 single-process ───────────────────────────────────

const state = {
  running:          false,
  intensity:        null as Intensity | null,
  started_at:       null as string | null,
  ends_at:          null as string | null,
  orders_created:   0,
  orders_paid:      0,
  orders_cancelled: 0,
  errors:           0,
  response_ms:      [] as number[],      // últimas 2000 muestras
  orders_per_venue: {} as Record<string, number>,
  _timer:    null as ReturnType<typeof setInterval>  | null,
  _stopper:  null as ReturnType<typeof setTimeout>   | null,
  _zones:    [] as ZoneCode[],
  _products: [] as SimProduct[],
  _venues:   [] as SimVenue[],
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function rnd<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function sample<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, Math.min(n, arr.length))
}

function computeAvg(arr: number[]): number {
  if (arr.length === 0) return 0
  return Math.round(arr.reduce((s, v) => s + v, 0) / arr.length)
}

function computeP95(arr: number[]): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  return sorted[Math.ceil(0.95 * sorted.length) - 1] ?? 0
}

const NAMES     = ['Carlos', 'María', 'Luis', 'Ana', 'Pedro', 'Luisa', 'José', 'Laura', 'Miguel', 'Sofía']
const LASTNAMES = ['García', 'López', 'Martínez', 'Pérez', 'Rodríguez', 'Gómez', 'Díaz', 'Torres']

function fakePerson(): { customer_name: string; customer_lastname: string } {
  return { customer_name: rnd(NAMES), customer_lastname: rnd(LASTNAMES) }
}

// ── Order operations ───────────────────────────────────────────────────────────

// Configurable: permite apuntar al puerto correcto en VPS (puerto 3002)
const BASE = process.env.SIMULATOR_BASE_URL ?? 'http://127.0.0.1:3002'

interface CreatedOrder {
  id:               number
  code:             string
  venue_destino_id: number | null
}

async function createOrder(zone: ZoneCode, products: SimProduct[]): Promise<CreatedOrder | null> {
  const t0 = Date.now()
  try {
    const res = await fetch(`${BASE}/api/orders`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: 'PUB',
        zone,
        ...fakePerson(),
        items: products.map(p => ({
          product_id: p.id,
          qty:        1,
          price_usd:  p.price_usd,
        })),
      }),
      signal: AbortSignal.timeout(10_000),
    })

    const ms = Date.now() - t0
    state.response_ms.push(ms)
    if (state.response_ms.length > 2_000) state.response_ms.shift()

    if (!res.ok) { state.errors++; return null }

    const data = await res.json() as {
      success: boolean
      order?:  { id: number; code: string; venue_destino_id: number | null }
    }
    if (!data.success || !data.order) { state.errors++; return null }

    state.orders_created++

    const vid   = data.order.venue_destino_id
    const key   = vid !== null
      ? (state._venues.find(v => v.id === vid)?.name ?? `venue_${vid}`)
      : 'sin_asignar'
    state.orders_per_venue[key] = (state.orders_per_venue[key] ?? 0) + 1

    return data.order
  } catch {
    state.errors++
    return null
  }
}

async function bumpOrder(orderId: number): Promise<void> {
  for (const status of ['PREP', 'LISTO'] as const) {
    await new Promise<void>(r => setTimeout(r, 300))
    try {
      await prisma.order.update({
        where: { id: orderId },
        data:  { kitchen_status: status },
      })
    } catch { /* non-fatal */ }
  }
}

async function payOrder(orderId: number): Promise<void> {
  try {
    await prisma.order.update({
      where: { id: orderId },
      data:  { payment_status: 'PAID', paid_at: new Date() },
    })
    state.orders_paid++
  } catch { /* non-fatal */ }
}

async function cancelOrder(orderId: number): Promise<void> {
  try {
    await prisma.order.update({
      where: { id: orderId },
      data:  { payment_status: 'CANCELLED' },
    })
    state.orders_cancelled++
  } catch { /* non-fatal */ }
}

// ── Tick ───────────────────────────────────────────────────────────────────────

async function tick(): Promise<void> {
  if (!state.running) return
  if (state._zones.length === 0 || state._products.length === 0) return

  const zone     = rnd(state._zones)
  const qty      = Math.floor(Math.random() * 4) + 1  // 1-4 productos
  const products = sample(state._products, qty)

  const order = await createOrder(zone, products)
  if (!order) return

  const roll = Math.random()

  // 5% → cancelar
  if (roll < 0.05) {
    void cancelOrder(order.id)
    return
  }

  // 70% → bump KDS (NUEVO → PREP → LISTO)
  if (roll < 0.75) {
    void bumpOrder(order.id).then(() => {
      // 60% de los bumpeados → PAID
      if (Math.random() < 0.60) {
        void payOrder(order.id)
      }
    })
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function startSimulation(
  intensity:        Intensity,
  duration_minutes: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (state.running) return { ok: false, error: 'Ya hay una simulación en curso. Usa /api/simulate/stop primero.' }

  const [zones, products, venues] = await Promise.all([
    prisma.zone.findMany({    where: { is_active: true }, select: { name: true } }),
    prisma.product.findMany({ where: { is_active: true }, select: { id: true, name: true, price_usd: true } }),
    prisma.venue.findMany({   where: { is_active: true }, select: { id: true, name: true } }),
  ])

  // Filtrar zonas de DB a ZoneCode válidos — el API de órdenes lo exige
  const validZones = zones
    .map(z => z.name)
    .filter((n): n is ZoneCode => (ZONE_CODES as readonly string[]).includes(n))

  state._zones    = validZones.length > 0 ? validZones : [...ZONE_CODES]
  state._products = products.map(p => ({ id: p.id, name: p.name, price_usd: Number(p.price_usd) }))
  state._venues   = venues

  if (state._products.length === 0) {
    return { ok: false, error: 'No hay productos activos en DB' }
  }

  // Reset métricas
  state.orders_created   = 0
  state.orders_paid      = 0
  state.orders_cancelled = 0
  state.errors           = 0
  state.response_ms      = []
  state.orders_per_venue = {}
  state.running          = true
  state.intensity        = intensity
  state.started_at       = new Date().toISOString()
  state.ends_at          = new Date(Date.now() + duration_minutes * 60_000).toISOString()

  const { interval_ms } = SCENARIOS[intensity]

  void tick()  // primera iteración inmediata
  state._timer   = setInterval(() => { void tick() }, interval_ms)
  state._stopper = setTimeout(() => stopSimulation(), duration_minutes * 60_000)

  return { ok: true }
}

export function stopSimulation(): void {
  if (state._timer)   clearInterval(state._timer)
  if (state._stopper) clearTimeout(state._stopper)
  state._timer   = null
  state._stopper = null
  state.running  = false
}

export function getStatus(): SimStatus {
  return {
    running:          state.running,
    intensity:        state.intensity,
    started_at:       state.started_at,
    ends_at:          state.ends_at,
    orders_created:   state.orders_created,
    orders_paid:      state.orders_paid,
    orders_cancelled: state.orders_cancelled,
    errors:           state.errors,
    avg_response_ms:  computeAvg(state.response_ms),
    p95_response_ms:  computeP95(state.response_ms),
    orders_per_venue: { ...state.orders_per_venue },
  }
}
