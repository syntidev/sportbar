import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const TURNO_KEY = 'turno_activo'

interface TurnoValue {
  is_active:      boolean
  partido_nombre: string
  opened_at:      string
  opened_by:      string
  closed_at?:     string
}

async function readTurno(): Promise<TurnoValue | null> {
  const row = await prisma.config.findUnique({ where: { key: TURNO_KEY } })
  if (!row) return null
  try {
    return JSON.parse(row.value) as TurnoValue
  } catch {
    return null
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MetodoPago {
  method:    string
  count:     number
  total_usd: number
  total_bs:  number
}

export interface CreditoRow {
  id:                number
  code:              string
  customer_name:     string
  customer_lastname: string
  customer_id:       string | null
  zone:              string
  seat:              string | null
  total_usd:         number
  total_bs:          number
  note:              string | null
  created_at:        string
}

export interface CanceladaRow {
  id:            number
  code:          string
  customer_name: string
  total_usd:     number
  note:          string | null
  created_at:    string
}

export interface CajaTotales {
  cobrado_usd:    number
  cobrado_bs:     number
  credito_usd:    number
  credito_bs:     number
  pendiente_usd:  number
  pendiente_bs:   number
  cancelado_usd:  number
  gran_total_usd: number
  gran_total_bs:  number
  order_count:    number
}

export interface CajaData {
  turno: {
    is_active:      boolean
    partido_nombre: string
    opened_at:      string
    duration_min:   number
  }
  por_metodo:  MetodoPago[]
  creditos:    CreditoRow[]
  canceladas:  CanceladaRow[]
  totales:     CajaTotales
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const turno = await readTurno()

    if (!turno?.is_active || !turno.opened_at) {
      return NextResponse.json({ success: false, error: 'No hay turno activo' }, { status: 404 })
    }

    const openedAt = new Date(turno.opened_at)
    const durationMin = Math.floor((Date.now() - openedAt.getTime()) / 60_000)

    const orders = await prisma.order.findMany({
      where: { created_at: { gte: openedAt } },
      select: {
        id:                true,
        code:              true,
        payment_status:    true,
        payment_method:    true,
        customer_name:     true,
        customer_lastname: true,
        customer_id:       true,
        zone:              true,
        seat:              true,
        total_usd:         true,
        total_bs:          true,
        note:              true,
        created_at:        true,
      },
      orderBy: { created_at: 'asc' },
    })

    // ── Aggregar por método ────────────────────────────────────────────────────

    const metodoMap = new Map<string, { count: number; usd: number; bs: number }>()

    for (const o of orders) {
      if (o.payment_status !== 'PAID') continue
      const key = o.payment_method ?? 'Sin método'
      const existing = metodoMap.get(key) ?? { count: 0, usd: 0, bs: 0 }
      metodoMap.set(key, {
        count: existing.count + 1,
        usd:   existing.usd + Number(o.total_usd),
        bs:    existing.bs  + Number(o.total_bs),
      })
    }

    const por_metodo: MetodoPago[] = Array.from(metodoMap.entries())
      .map(([method, v]) => ({
        method,
        count:     v.count,
        total_usd: Math.round(v.usd * 100) / 100,
        total_bs:  Math.round(v.bs  * 100) / 100,
      }))
      .sort((a, b) => b.total_usd - a.total_usd)

    // ── Créditos ──────────────────────────────────────────────────────────────

    const creditos: CreditoRow[] = orders
      .filter((o) => o.payment_status === 'CREDIT')
      .map((o) => ({
        id:                o.id,
        code:              o.code,
        customer_name:     o.customer_name,
        customer_lastname: o.customer_lastname,
        customer_id:       o.customer_id,
        zone:              o.zone,
        seat:              o.seat,
        total_usd:         Number(o.total_usd),
        total_bs:          Number(o.total_bs),
        note:              o.note,
        created_at:        o.created_at.toISOString(),
      }))

    // ── Canceladas ────────────────────────────────────────────────────────────

    const canceladas: CanceladaRow[] = orders
      .filter((o) => o.payment_status === 'CANCELLED')
      .map((o) => ({
        id:            o.id,
        code:          o.code,
        customer_name: `${o.customer_name} ${o.customer_lastname}`,
        total_usd:     Number(o.total_usd),
        note:          o.note,
        created_at:    o.created_at.toISOString(),
      }))

    // ── Totales ───────────────────────────────────────────────────────────────

    const cobrado_usd   = orders.filter((o) => o.payment_status === 'PAID').reduce((s, o) => s + Number(o.total_usd), 0)
    const cobrado_bs    = orders.filter((o) => o.payment_status === 'PAID').reduce((s, o) => s + Number(o.total_bs),  0)
    const credito_usd   = creditos.reduce((s, o) => s + o.total_usd, 0)
    const credito_bs    = creditos.reduce((s, o) => s + o.total_bs,  0)
    const pendiente_usd = orders.filter((o) => o.payment_status === 'PEND').reduce((s, o) => s + Number(o.total_usd), 0)
    const pendiente_bs  = orders.filter((o) => o.payment_status === 'PEND').reduce((s, o) => s + Number(o.total_bs),  0)
    const cancelado_usd = canceladas.reduce((s, o) => s + o.total_usd, 0)

    const gran_total_usd = cobrado_usd + credito_usd + pendiente_usd
    const gran_total_bs  = cobrado_bs  + credito_bs  + pendiente_bs

    const totales: CajaTotales = {
      cobrado_usd:    Math.round(cobrado_usd   * 100) / 100,
      cobrado_bs:     Math.round(cobrado_bs    * 100) / 100,
      credito_usd:    Math.round(credito_usd   * 100) / 100,
      credito_bs:     Math.round(credito_bs    * 100) / 100,
      pendiente_usd:  Math.round(pendiente_usd * 100) / 100,
      pendiente_bs:   Math.round(pendiente_bs  * 100) / 100,
      cancelado_usd:  Math.round(cancelado_usd * 100) / 100,
      gran_total_usd: Math.round(gran_total_usd * 100) / 100,
      gran_total_bs:  Math.round(gran_total_bs  * 100) / 100,
      order_count: orders.filter((o) => o.payment_status !== 'CANCELLED').length,
    }

    const data: CajaData = {
      turno: {
        is_active:      turno.is_active,
        partido_nombre: turno.partido_nombre,
        opened_at:      turno.opened_at,
        duration_min:   durationMin,
      },
      por_metodo,
      creditos,
      canceladas,
      totales,
    }

    return NextResponse.json({ success: true, caja: data })
  } catch (err) {
    console.error('[caja] error', err)
    return NextResponse.json({ success: false, error: 'Error al calcular caja' }, { status: 500 })
  }
}
