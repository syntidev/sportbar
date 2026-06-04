'use client'

import { useCallback, useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle, CheckCircle, Circle, Clock,
  Info, ShoppingBag, TrendingUp, WifiOff, Zap,
} from 'lucide-react'
import type { KitchenStatus, PaymentStatus } from '@/types'
import styles from './warroom.module.css'

// ── Types ──────────────────────────────────────────────────────────────────────

interface WRItem {
  qty:     number
  product: { name: string }
}

interface WROrder {
  id:               number
  code:             string
  kitchen_status:   KitchenStatus
  payment_status:   PaymentStatus
  zone:             string
  seat:             string | null
  total_usd:        string
  created_at:       string
  updated_at:       string
  venue_destino_id: number | null
  items:            WRItem[]
}

interface WRTurno {
  is_active:      boolean
  partido_nombre: string
  opened_at:      string
}

interface WRCajaData {
  cobrado_usd:    number
  gran_total_usd: number
  order_count:    number
}

interface WRVenue {
  id:        number
  name:      string
  type:      string
  is_active: boolean
}

interface WRAlert {
  level: 'danger' | 'warn' | 'ok'
  msg:   string
}

// ── Constants ──────────────────────────────────────────────────────────────────

const MAX_VENUE_CAP   = 20
const MAX_CARDS       = 8

// ── Helpers ────────────────────────────────────────────────────────────────────

function ageMs(iso: string): number {
  return Date.now() - new Date(iso).getTime()
}

function fmtElapsed(ms: number): string {
  const s   = Math.max(0, Math.floor(ms / 1_000))
  const h   = Math.floor(s / 3600)
  const m   = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

function timerClass(ms: number): string {
  const min = ms / 60_000
  if (min < 3) return styles.timerOk
  if (min < 6) return styles.timerWarn
  return styles.timerDanger
}

// ── Hooks ──────────────────────────────────────────────────────────────────────

function useTick(intervalMs: number): number {
  const [t, setT] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setT(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return t
}

// ── TurnoTimer — 1 s tick ──────────────────────────────────────────────────────

function TurnoTimer({ openedAt }: { openedAt: string }) {
  const tick = useTick(1_000)
  return (
    <span className={styles.turnoTimer}>
      {fmtElapsed(tick - new Date(openedAt).getTime())}
    </span>
  )
}

// ── KanbanCard ─────────────────────────────────────────────────────────────────

function KanbanCard({ order, tick }: { order: WROrder; tick: number }) {
  const ms      = tick - new Date(order.created_at).getTime()
  const summary = order.items.slice(0, 2).map(i => `${i.qty}× ${i.product.name}`).join(' · ')
  const extra   = order.items.length - 2

  return (
    <a
      href={`/admin/partido/${order.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.card}
    >
      <div className={styles.cardHead}>
        <span className={styles.cardCode}>{order.code}</span>
        <span className={`${styles.cardTimer} ${timerClass(ms)}`}>
          <Clock size={9} aria-hidden />
          {fmtElapsed(ms)}
        </span>
      </div>
      <div className={styles.cardZone}>
        {order.zone}{order.seat ? ` · ${order.seat}` : ''}
      </div>
      <div className={styles.cardItems}>
        {summary}{extra > 0 ? ` +${extra}` : ''}
      </div>
      <div className={styles.cardFoot}>
        <span className={styles.cardTotal}>
          REF {parseFloat(order.total_usd).toFixed(2)}
        </span>
        {(order.payment_status === 'PEND' || order.payment_status === 'CREDIT') && (
          <span className={`${styles.payBadge} ${styles[`pay_${order.payment_status}`]}`}>
            {order.payment_status}
          </span>
        )}
      </div>
    </a>
  )
}

// ── KanbanCol ──────────────────────────────────────────────────────────────────

function KanbanCol({
  title, colStyle, orders, tick, Icon,
}: {
  title:    string
  colStyle: string
  orders:   WROrder[]
  tick:     number
  Icon:     LucideIcon
}) {
  const visible = orders.slice(0, MAX_CARDS)
  const extra   = orders.length - visible.length

  return (
    <div className={`${styles.col} ${colStyle}`}>
      <div className={styles.colHead}>
        <Icon size={12} aria-hidden />
        <span className={styles.colTitle}>{title}</span>
        <span className={styles.colCount}>{orders.length}</span>
      </div>
      <div className={styles.colBody}>
        {visible.map(o => (
          <KanbanCard key={o.id} order={o} tick={tick} />
        ))}
        {extra > 0 && (
          <div className={styles.colMore}>+{extra} más</div>
        )}
        {orders.length === 0 && (
          <div className={styles.colEmpty}>—</div>
        )}
      </div>
    </div>
  )
}

// ── WarRoomPage ────────────────────────────────────────────────────────────────

export default function WarRoomPage() {
  const [orders,    setOrders]    = useState<WROrder[]>([])
  const [turno,     setTurno]     = useState<WRTurno | null>(null)
  const [caja,      setCaja]      = useState<WRCajaData | null>(null)
  const [venues,    setVenues]    = useState<WRVenue[]>([])
  const [rate,      setRate]      = useState(0)
  const [stale,     setStale]     = useState(false)
  const [ready,     setReady]     = useState(false)

  const tick = useTick(5_000)

  // ── Fetchers ────────────────────────────────────────────────────────────────

  const fetchOrders = useCallback(async () => {
    try {
      const r = await fetch('/api/orders?status=active&limit=200')
      const d = await r.json() as { success: boolean; orders?: WROrder[] }
      if (d.success && d.orders) { setOrders(d.orders); setStale(false) }
    } catch { setStale(true) }
  }, [])

  const fetchMetrics = useCallback(async () => {
    try {
      const [turnoR, cajaR, curR] = await Promise.allSettled([
        fetch('/api/turno').then(r => r.json()),
        fetch('/api/caja').then(r => r.json()),
        fetch('/api/currency').then(r => r.json()),
      ])
      if (turnoR.status === 'fulfilled' && (turnoR.value as { success: boolean }).success)
        setTurno((turnoR.value as { turno: WRTurno }).turno)
      if (cajaR.status === 'fulfilled' && (cajaR.value as { success: boolean }).success)
        setCaja(((cajaR.value as { caja: { totales: WRCajaData } }).caja).totales)
      if (curR.status === 'fulfilled' && typeof (curR.value as { rate?: unknown }).rate === 'number')
        setRate((curR.value as { rate: number }).rate)
    } catch { /* keep previous */ }
  }, [])

  const fetchVenues = useCallback(async () => {
    try {
      const r = await fetch('/api/venues')
      const d = await r.json() as { success: boolean; venues?: WRVenue[] }
      if (d.success && d.venues) setVenues(d.venues)
    } catch { /* keep previous */ }
  }, [])

  // ── Init + polling ───────────────────────────────────────────────────────────

  useEffect(() => {
    void Promise.all([fetchOrders(), fetchMetrics(), fetchVenues()])
      .finally(() => setReady(true))

    const t1 = setInterval(fetchOrders,  5_000)
    const t2 = setInterval(fetchMetrics, 10_000)
    const t3 = setInterval(fetchVenues,  15_000)
    return () => { clearInterval(t1); clearInterval(t2); clearInterval(t3) }
  }, [fetchOrders, fetchMetrics, fetchVenues])

  // ── Derived ──────────────────────────────────────────────────────────────────

  const active    = orders.filter(o => o.payment_status !== 'CANCELLED')
  const nuevo     = active.filter(o => o.kitchen_status === 'NUEVO')
  const prep      = active.filter(o => o.kitchen_status === 'PREP')
  const listo     = active.filter(o => o.kitchen_status === 'LISTO')
  const entregado = active.filter(o => o.kitchen_status === 'ENTREGADO')

  // Venue load: in-flight (non-ENTREGADO) orders per venue
  const venueCounts: Record<number, number> = {}
  for (const o of active) {
    if (o.kitchen_status !== 'ENTREGADO' && o.venue_destino_id !== null) {
      venueCounts[o.venue_destino_id] = (venueCounts[o.venue_destino_id] ?? 0) + 1
    }
  }

  const venueRows = venues
    .filter(v => v.is_active)
    .map(v => {
      const count = venueCounts[v.id] ?? 0
      const pct   = Math.round((count / MAX_VENUE_CAP) * 100)
      return { ...v, count, pct }
    })

  // Alerts (max 4, ordered: danger → warn → ok)
  const alerts: WRAlert[] = []

  for (const o of nuevo) {
    if (ageMs(o.created_at) > 8 * 60_000 && alerts.filter(a => a.level === 'danger').length < 2) {
      alerts.push({
        level: 'danger',
        msg:   `${o.code} — ${Math.floor(ageMs(o.created_at) / 60_000)} min sin atender`,
      })
    }
  }

  for (const v of venueRows) {
    if (v.pct > 80) {
      alerts.push({ level: 'warn', msg: `${v.name} al ${v.pct}% de capacidad` })
    }
  }

  if (turno?.is_active && turno.opened_at) {
    const mins = Math.floor(ageMs(turno.opened_at) / 60_000)
    const h    = Math.floor(mins / 60)
    const m    = mins % 60
    alerts.push({
      level: 'ok',
      msg:   `Turno activo · ${h > 0 ? `${h}h ` : ''}${m}min · ${turno.partido_nombre}`,
    })
  }

  const visibleAlerts = alerts.slice(0, 4)

  // ── Skeleton ─────────────────────────────────────────────────────────────────

  if (!ready) {
    return (
      <div className={styles.warroom}>
        <div className={styles.skeletonHeader} />
        <div className={styles.skeletonKanban}>
          {[0, 1, 2, 3].map(i => <div key={i} className={styles.skeletonCol} />)}
        </div>
        <div className={styles.skeletonFooter} />
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className={styles.warroom}>

      {/* ══ HEADER ════════════════════════════════════════════════════════════ */}
      <header className={styles.header}>

        <div className={styles.hLeft}>
          <Zap size={14} className={styles.zapIcon} aria-hidden />
          <span className={styles.wrTitle}>WAR ROOM</span>
          <span className={`${styles.dot} ${turno?.is_active ? styles.dotOn : styles.dotOff}`} />
          <span className={styles.hStatus}>
            {turno?.is_active ? (turno.partido_nombre || 'ACTIVO') : 'SIN TURNO'}
          </span>
          {turno?.is_active && turno.opened_at && (
            <TurnoTimer openedAt={turno.opened_at} />
          )}
          {stale && (
            <span className={styles.staleBadge}>
              <WifiOff size={10} aria-hidden />
              sin red
            </span>
          )}
        </div>

        <div className={styles.hCenter}>
          <div className={styles.hMetric}>
            <ShoppingBag size={11} aria-hidden />
            <strong>{caja?.order_count ?? active.length}</strong>
            <span>órdenes</span>
          </div>
          <div className={styles.hDivider} />
          <div className={styles.hMetric}>
            <TrendingUp size={11} aria-hidden />
            <strong>REF {(caja?.cobrado_usd ?? 0).toFixed(2)}</strong>
            <span>cobrado</span>
          </div>
          {rate > 0 && (
            <>
              <div className={styles.hDivider} />
              <div className={styles.hMetric}>
                <strong>{rate.toFixed(2)}</strong>
                <span>Bs/REF</span>
              </div>
            </>
          )}
        </div>

        <div className={styles.hRight}>
          {turno?.is_active && (
            <a href="/admin/turno" className={styles.closeTurnoBtn}>
              Cerrar turno →
            </a>
          )}
        </div>

      </header>

      {/* ══ KANBAN ════════════════════════════════════════════════════════════ */}
      <div className={styles.kanban}>

        <KanbanCol
          title="NUEVAS"
          colStyle={styles.colNuevo}
          orders={nuevo}
          tick={tick}
          Icon={Circle}
        />
        <KanbanCol
          title="EN PREP"
          colStyle={styles.colPrep}
          orders={prep}
          tick={tick}
          Icon={Clock}
        />
        <KanbanCol
          title="LISTAS"
          colStyle={styles.colListo}
          orders={listo}
          tick={tick}
          Icon={CheckCircle}
        />

        {/* DESPACHADAS — stats only */}
        <div className={`${styles.col} ${styles.colEntregado}`}>
          <div className={styles.colHead}>
            <Zap size={12} aria-hidden />
            <span className={styles.colTitle}>DESPACHADAS</span>
            <span className={styles.colCount}>{entregado.length}</span>
          </div>
          <div className={styles.statsBox}>
            <div className={styles.sItem}>
              <span className={styles.sVal}>{entregado.length}</span>
              <span className={styles.sLbl}>entregadas</span>
            </div>
            <div className={styles.sDivider} />
            <div className={styles.sItem}>
              <span className={styles.sVal}>{active.length}</span>
              <span className={styles.sLbl}>activas</span>
            </div>
            <div className={styles.sDivider} />
            <div className={styles.sItem}>
              <span className={`${styles.sVal} ${styles.sGreen}`}>
                REF {(caja?.cobrado_usd ?? 0).toFixed(2)}
              </span>
              <span className={styles.sLbl}>cobrado</span>
            </div>
            <div className={styles.sDivider} />
            <div className={styles.sItem}>
              <span className={styles.sVal}>
                REF {(caja?.gran_total_usd ?? 0).toFixed(2)}
              </span>
              <span className={styles.sLbl}>facturado</span>
            </div>
          </div>
        </div>

      </div>

      {/* ══ FOOTER ════════════════════════════════════════════════════════════ */}
      <footer className={styles.footer}>

        {/* Venue load */}
        <div className={styles.footVenues}>
          <span className={styles.footTitle}>CARGA VENUES</span>
          <div className={styles.venueBars}>
            {venueRows.map(v => (
              <div key={v.id} className={styles.venueRow}>
                <span className={styles.venueName} title={v.name}>
                  {v.name.length > 10 ? `${v.name.slice(0, 10)}…` : v.name}
                </span>
                <div className={styles.barTrack}>
                  <div
                    className={`${styles.barFill} ${
                      v.pct > 80 ? styles.barDanger
                      : v.pct > 60 ? styles.barWarn
                      : styles.barOk
                    }`}
                    style={{ width: `${Math.min(v.pct, 100)}%` }}
                  />
                </div>
                <span className={styles.venueInfo}>{v.pct}% ({v.count})</span>
              </div>
            ))}
            {venueRows.length === 0 && (
              <span className={styles.footEmpty}>Sin datos</span>
            )}
          </div>
        </div>

        <div className={styles.footDivider} />

        {/* Alerts */}
        <div className={styles.footAlerts}>
          <span className={styles.footTitle}>ALERTAS</span>
          <div className={styles.alertList}>
            {visibleAlerts.length === 0 && (
              <div className={`${styles.alertRow} ${styles.alertOk}`}>
                <CheckCircle size={11} aria-hidden />
                <span>Todo en orden</span>
              </div>
            )}
            {visibleAlerts.map((a, i) => (
              <div
                key={i}
                className={`${styles.alertRow} ${
                  a.level === 'danger' ? styles.alertDanger
                  : a.level === 'warn' ? styles.alertWarn
                  : styles.alertOk
                }`}
              >
                {a.level === 'danger' && <AlertTriangle size={11} aria-hidden />}
                {a.level === 'warn'   && <AlertTriangle size={11} aria-hidden />}
                {a.level === 'ok'     && <Info size={11} aria-hidden />}
                <span>{a.msg}</span>
              </div>
            ))}
          </div>
        </div>

      </footer>
    </div>
  )
}
