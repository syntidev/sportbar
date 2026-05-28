import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TurnoValue {
  is_active:       boolean
  partido_nombre:  string
  opened_at:       string
  opened_by:       string
  closed_at?:      string
}

export interface PartidoMeta {
  config_id:      number
  config_key:     string
  partido_nombre: string
  opened_at:      string
  closed_at:      string | null
  is_active:      boolean
  duration_min:   number
  opened_by:      string
}

export interface ResumenEjecutivo {
  total_ordenes:   number
  pub_count:       number
  pub_pct:         number
  loc_count:       number
  loc_pct:         number
  revenue_usd:     number
  revenue_bs:      number
  ticket_avg_usd:  number
  orden_max:       { code: string; total_usd: number; customer_name: string } | null
  avg_service_min: number | null
}

export interface TopProductoItem {
  product_id:  number
  name:        string
  category:    string
  qty:         number
  revenue_usd: number
}

export interface TopProductos {
  por_cantidad:  TopProductoItem[]
  por_revenue:   TopProductoItem[]
  top_categoria: { category: string; qty: number; revenue_usd: number } | null
}

export interface VenueStats {
  venue_id:        number | null
  label:           string
  order_count:     number
  revenue_usd:     number
  avg_service_min: number | null
}

export interface AnomaliaOrden {
  id:           number
  code:         string
  customer_name: string
  total_usd:    number
  zone:         string
  note:         string | null
  actor_code:   string | null
  ts:           string
}

export interface Anomalias {
  canceladas: AnomaliaOrden[]
  creditos:   AnomaliaOrden[]
  sin_venue:  AnomaliaOrden[]
}

export interface TimelineHour {
  hour:  number
  label: string
  count: number
}

export interface PartidoData {
  meta:         PartidoMeta
  resumen:      ResumenEjecutivo
  top_productos: TopProductos
  por_venue:    VenueStats[]
  anomalias:    Anomalias
  timeline:     TimelineHour[]
  peak_hour:    TimelineHour | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function round2(n: number) { return Math.round(n * 100) / 100 }
function pad2(n: number)   { return String(n).padStart(2, '0') }

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const idParam = params.id
  const numId   = parseInt(idParam, 10)

  try {
    // ── 1. Fetch Config row ─────────────────────────────────────────────────

    const row = !isNaN(numId)
      ? await prisma.config.findUnique({ where: { id: numId } })
      : idParam === 'activo'
      ? await prisma.config.findUnique({ where: { key: 'turno_activo' } })
      : null

    if (!row) {
      return NextResponse.json({ success: false, error: 'Partido no encontrado' }, { status: 404 })
    }

    let turno: TurnoValue
    try {
      turno = JSON.parse(row.value) as TurnoValue
    } catch {
      return NextResponse.json({ success: false, error: 'Datos del turno inválidos' }, { status: 422 })
    }

    if (!turno.opened_at) {
      return NextResponse.json({ success: false, error: 'Turno sin fecha de apertura' }, { status: 422 })
    }

    const openedAt = new Date(turno.opened_at)
    const closedAt = turno.closed_at ? new Date(turno.closed_at) : null
    const endAt    = closedAt ?? new Date()

    // ── 2. Fetch orders (single query, eager loading) ───────────────────────

    const orders = await prisma.order.findMany({
      where: {
        created_at: { gte: openedAt, lte: endAt },
      },
      include: {
        items: { include: { product: { select: { id: true, name: true, category: true } } } },
        logs:  { orderBy: { created_at: 'asc' } },
        user:  { select: { code: true, name: true } },
      },
      orderBy: { created_at: 'asc' },
    })

    // ── 3. Fetch venues for label resolution ────────────────────────────────

    const venueIds = Array.from(new Set(orders.map((o) => o.venue_assigned).filter((v): v is number => v !== null)))
    const venueRows = venueIds.length > 0
      ? await prisma.venue.findMany({ where: { id: { in: venueIds } }, select: { id: true, name: true } })
      : []
    const venueMap = new Map(venueRows.map((v) => [v.id, v.name]))

    // ── 4. Build resumen ────────────────────────────────────────────────────

    const validOrders   = orders.filter((o) => o.payment_status !== 'CANCELLED')
    const pubOrders     = validOrders.filter((o) => o.origin === 'PUB')
    const locOrders     = validOrders.filter((o) => o.origin === 'LOC')
    const revenue_usd   = validOrders.reduce((s, o) => s + Number(o.total_usd), 0)
    const revenue_bs    = validOrders.reduce((s, o) => s + Number(o.total_bs),  0)
    const ticket_avg    = validOrders.length > 0 ? revenue_usd / validOrders.length : 0
    const ordenMax      = validOrders.reduce<(typeof validOrders)[0] | null>((max, o) =>
      !max || Number(o.total_usd) > Number(max.total_usd) ? o : max, null)

    // avg service time: created_at → log ENTREGADO
    const serviceTimes: number[] = []
    for (const o of validOrders) {
      const entregadoLog = o.logs.find((l) => l.action === 'KITCHEN_STATUS_CHANGE' && l.to_state === 'ENTREGADO')
      if (entregadoLog) {
        const mins = (entregadoLog.created_at.getTime() - o.created_at.getTime()) / 60_000
        if (mins > 0 && mins < 240) serviceTimes.push(mins)
      }
    }
    const avg_service_min = serviceTimes.length > 0
      ? round2(serviceTimes.reduce((s, t) => s + t, 0) / serviceTimes.length)
      : null

    const resumen: ResumenEjecutivo = {
      total_ordenes:   validOrders.length,
      pub_count:       pubOrders.length,
      pub_pct:         validOrders.length > 0 ? round2((pubOrders.length / validOrders.length) * 100) : 0,
      loc_count:       locOrders.length,
      loc_pct:         validOrders.length > 0 ? round2((locOrders.length / validOrders.length) * 100) : 0,
      revenue_usd:     round2(revenue_usd),
      revenue_bs:      round2(revenue_bs),
      ticket_avg_usd:  round2(ticket_avg),
      orden_max:       ordenMax
        ? { code: ordenMax.code, total_usd: Number(ordenMax.total_usd), customer_name: `${ordenMax.customer_name} ${ordenMax.customer_lastname}` }
        : null,
      avg_service_min,
    }

    // ── 5. Top productos ────────────────────────────────────────────────────

    type ProdAccum = { product_id: number; name: string; category: string; qty: number; revenue_usd: number }
    const prodMap = new Map<number, ProdAccum>()
    const catMap  = new Map<string, { qty: number; revenue_usd: number }>()

    for (const o of validOrders) {
      for (const item of o.items) {
        const pid  = item.product_id
        const name = item.product.name
        const cat  = item.product.category
        const sub  = Number(item.subtotal)

        const existing = prodMap.get(pid) ?? { product_id: pid, name, category: cat, qty: 0, revenue_usd: 0 }
        prodMap.set(pid, { ...existing, qty: existing.qty + item.qty, revenue_usd: existing.revenue_usd + sub })

        const catExisting = catMap.get(cat) ?? { qty: 0, revenue_usd: 0 }
        catMap.set(cat, { qty: catExisting.qty + item.qty, revenue_usd: catExisting.revenue_usd + sub })
      }
    }

    const allProds  = Array.from(prodMap.values())
    const topCatEntry = Array.from(catMap.entries()).sort((a, b) => b[1].qty - a[1].qty)[0]

    const top_productos: TopProductos = {
      por_cantidad: allProds.sort((a, b) => b.qty - a.qty).slice(0, 5).map((p) => ({ ...p, revenue_usd: round2(p.revenue_usd) })),
      por_revenue:  [...allProds].sort((a, b) => b.revenue_usd - a.revenue_usd).slice(0, 5).map((p) => ({ ...p, revenue_usd: round2(p.revenue_usd) })),
      top_categoria: topCatEntry
        ? { category: topCatEntry[0], qty: topCatEntry[1].qty, revenue_usd: round2(topCatEntry[1].revenue_usd) }
        : null,
    }

    // ── 6. Por venue ────────────────────────────────────────────────────────

    type VenueAccum = { count: number; revenue: number; times: number[] }
    const venueAccum = new Map<number | null, VenueAccum>()

    for (const o of validOrders) {
      const vid     = o.venue_assigned
      const existing = venueAccum.get(vid) ?? { count: 0, revenue: 0, times: [] }
      const entLog   = o.logs.find((l) => l.action === 'KITCHEN_STATUS_CHANGE' && l.to_state === 'ENTREGADO')
      const mins     = entLog ? (entLog.created_at.getTime() - o.created_at.getTime()) / 60_000 : null
      venueAccum.set(vid, {
        count:   existing.count + 1,
        revenue: existing.revenue + Number(o.total_usd),
        times:   mins !== null && mins > 0 && mins < 240 ? [...existing.times, mins] : existing.times,
      })
    }

    const por_venue: VenueStats[] = Array.from(venueAccum.entries())
      .map(([vid, acc]) => ({
        venue_id:        vid,
        label:           vid !== null ? (venueMap.get(vid) ?? `Venue #${vid}`) : 'Sin venue',
        order_count:     acc.count,
        revenue_usd:     round2(acc.revenue),
        avg_service_min: acc.times.length > 0
          ? round2(acc.times.reduce((s, t) => s + t, 0) / acc.times.length)
          : null,
      }))
      .sort((a, b) => b.revenue_usd - a.revenue_usd)

    // ── 7. Anomalias ────────────────────────────────────────────────────────

    const canceladas: AnomaliaOrden[] = orders
      .filter((o) => o.payment_status === 'CANCELLED')
      .map((o) => {
        const cancelLog = [...o.logs].reverse().find((l) => l.to_state === 'CANCELLED')
        return {
          id:            o.id,
          code:          o.code,
          customer_name: `${o.customer_name} ${o.customer_lastname}`,
          total_usd:     Number(o.total_usd),
          zone:          o.zone,
          note:          cancelLog?.note ?? o.note,
          actor_code:    cancelLog?.actor_code ?? null,
          ts:            (cancelLog?.created_at ?? o.updated_at).toISOString(),
        }
      })

    const creditos: AnomaliaOrden[] = validOrders
      .filter((o) => o.payment_status === 'CREDIT')
      .map((o) => ({
        id:            o.id,
        code:          o.code,
        customer_name: `${o.customer_name} ${o.customer_lastname}`,
        total_usd:     Number(o.total_usd),
        zone:          o.zone,
        note:          o.note,
        actor_code:    o.user?.code ?? null,
        ts:            o.created_at.toISOString(),
      }))

    const sin_venue: AnomaliaOrden[] = validOrders
      .filter((o) => o.venue_assigned === null)
      .map((o) => ({
        id:            o.id,
        code:          o.code,
        customer_name: `${o.customer_name} ${o.customer_lastname}`,
        total_usd:     Number(o.total_usd),
        zone:          o.zone,
        note:          null,
        actor_code:    o.user?.code ?? null,
        ts:            o.created_at.toISOString(),
      }))

    // ── 8. Timeline ─────────────────────────────────────────────────────────

    const hourMap = new Map<number, number>()
    for (const o of validOrders) {
      const h = o.created_at.getHours()
      hourMap.set(h, (hourMap.get(h) ?? 0) + 1)
    }

    // build contiguous range from first to last order hour
    const usedHours = Array.from(hourMap.keys()).sort((a, b) => a - b)
    const timeline: TimelineHour[] = []
    if (usedHours.length > 0) {
      const first = usedHours[0]
      const last  = usedHours[usedHours.length - 1]
      for (let h = first; h <= last; h++) {
        timeline.push({ hour: h, label: `${pad2(h)}:00`, count: hourMap.get(h) ?? 0 })
      }
    }

    const peak_hour = timeline.length > 0
      ? timeline.reduce((max, t) => t.count > max.count ? t : max)
      : null

    // ── 9. Assemble ─────────────────────────────────────────────────────────

    const durationMs = (closedAt ?? new Date()).getTime() - openedAt.getTime()

    const data: PartidoData = {
      meta: {
        config_id:      row.id,
        config_key:     row.key,
        partido_nombre: turno.partido_nombre,
        opened_at:      turno.opened_at,
        closed_at:      turno.closed_at ?? null,
        is_active:      turno.is_active,
        duration_min:   Math.floor(durationMs / 60_000),
        opened_by:      turno.opened_by,
      },
      resumen,
      top_productos,
      por_venue,
      anomalias: { canceladas, creditos, sin_venue },
      timeline,
      peak_hour,
    }

    return NextResponse.json({ success: true, partido: data })
  } catch (err) {
    console.error('[partido/[id]]', err)
    return NextResponse.json({ success: false, error: 'Error al calcular estadísticas' }, { status: 500 })
  }
}
