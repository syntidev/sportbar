'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, ClipboardList, RefreshCw } from 'lucide-react'
import type { KitchenStatus, Zone } from '@/types'
import styles from './page.module.css'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ComandaProduct {
  id:       number
  name:     string
  category: string
}

interface ComandaItem {
  id:      number
  qty:     number
  product: ComandaProduct
}

interface ComandaOrder {
  id:             number
  code:           string
  origin:         'PUB' | 'LOC'
  kitchen_status: KitchenStatus
  zone:           Zone
  seat:           string | null
  note:           string | null
  total_usd:      number
  created_at:     string
  items:          ComandaItem[]
  user:           { code: string; name: string } | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const POLL_MS = 15_000

const VISIBLE_STATUSES: KitchenStatus[] = ['NUEVO', 'PREP', 'LISTO']

const STATUS_LABEL: Record<string, string> = {
  NUEVO: 'Nuevo',
  PREP:  'Preparando',
  LISTO: 'Listo para entregar',
}

const ZONES: Array<{ value: Zone | 'Todas'; label: string }> = [
  { value: 'Todas',   label: 'Todas'   },
  { value: 'Norte',   label: 'Norte'   },
  { value: 'Sur',     label: 'Sur'     },
  { value: 'VIP',     label: 'VIP'     },
  { value: 'Externa', label: 'Externa' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function elapsedSecs(createdAt: string, now: Date): number {
  return Math.floor((now.getTime() - new Date(createdAt).getTime()) / 1000)
}

function fmtElapsed(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

async function fetchComandas(): Promise<ComandaOrder[]> {
  const res = await fetch('/api/orders?status=active&limit=200', { cache: 'no-store' })
  const data = await res.json()
  if (!data.success) throw new Error(data.error ?? 'Error al cargar comandas')

  return (data.orders as ComandaOrder[])
    .filter((o) => VISIBLE_STATUSES.includes(o.kitchen_status))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ComandasPage() {
  const [orders,    setOrders]    = useState<ComandaOrder[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [zone,      setZone]      = useState<Zone | 'Todas'>('Todas')
  const [now,       setNow]       = useState(() => new Date())
  const [lastSync,  setLastSync]  = useState<Date | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 1 s clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1_000)
    return () => clearInterval(t)
  }, [])

  const poll = useCallback(async () => {
    try {
      const data = await fetchComandas()
      setOrders(data)
      setError(null)
      setLastSync(new Date())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error de red')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    poll()
    pollRef.current = setInterval(poll, POLL_MS)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [poll])

  // filter by zone
  const visible = zone === 'Todas' ? orders : orders.filter((o) => o.zone === zone)

  // group by status
  const byStatus = (status: KitchenStatus) => visible.filter((o) => o.kitchen_status === status)

  const totalVisible = visible.length

  return (
    <div className={styles.page}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/pos" className={styles.backBtn} aria-label="Volver al inicio">
            <ArrowLeft size={18} />
          </Link>
          <ClipboardList size={20} strokeWidth={2} aria-hidden />
          <div>
            <span className={styles.headerTitle}>Comandas</span>
            <span className={styles.headerSub}>Pedidos activos del turno</span>
          </div>
        </div>

        <div className={styles.headerRight}>
          <span className={styles.clock}>
            {now.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          {lastSync && (
            <span className={styles.syncLabel}>
              <RefreshCw size={10} aria-hidden />
              {lastSync.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
        </div>
      </header>

      {/* ── Zone filter ─────────────────────────────────────────────────────── */}
      <nav className={styles.filterBar} aria-label="Filtro por zona">
        {ZONES.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={[styles.filterBtn, zone === value ? styles.filterActive : ''].join(' ')}
            onClick={() => setZone(value)}
            aria-pressed={zone === value}
          >
            {label}
          </button>
        ))}
        {totalVisible > 0 && (
          <span className={styles.countPill}>{totalVisible}</span>
        )}
      </nav>

      {/* ── Error ───────────────────────────────────────────────────────────── */}
      {error && (
        <div className={styles.errorBanner} role="alert">
          <AlertTriangle size={14} aria-hidden />
          {error}
        </div>
      )}

      {/* ── Loading ─────────────────────────────────────────────────────────── */}
      {loading && (
        <div className={styles.splash}>
          <span className={styles.spinner} aria-hidden />
          <span className={styles.splashText}>Cargando comandas…</span>
        </div>
      )}

      {/* ── Empty ───────────────────────────────────────────────────────────── */}
      {!loading && !error && visible.length === 0 && (
        <div className={styles.splash}>
          <ClipboardList size={48} strokeWidth={1} className={styles.emptyIcon} aria-hidden />
          <span className={styles.splashText}>Sin comandas activas</span>
        </div>
      )}

      {/* ── Columns ─────────────────────────────────────────────────────────── */}
      {!loading && visible.length > 0 && (
        <main className={styles.columns}>
          {VISIBLE_STATUSES.map((status) => {
            const group = byStatus(status)
            return (
              <section key={status} className={`${styles.column} ${styles[`col${status}`]}`}>
                <div className={`${styles.colHeader} ${styles[`colHeader${status}`]}`}>
                  <span className={styles.colTitle}>{STATUS_LABEL[status]}</span>
                  <span className={`${styles.colBadge} ${styles[`colBadge${status}`]}`}>
                    {group.length}
                  </span>
                </div>

                <div className={styles.cardList}>
                  {group.length === 0 && (
                    <p className={styles.colEmpty}>Sin pedidos</p>
                  )}
                  {group.map((order) => {
                    const secs    = elapsedSecs(order.created_at, now)
                    const isLate  = status === 'NUEVO' && secs >= 180   // 3 min late warning
                    const isLong  = status === 'PREP'  && secs >= 600   // 10 min prep warning

                    return (
                      <article
                        key={order.id}
                        className={[
                          styles.card,
                          styles[`card${status}`],
                          (isLate || isLong) ? styles.cardLate : '',
                        ].join(' ')}
                      >
                        {/* Code + zone */}
                        <div className={styles.cardHeader}>
                          <span className={`${styles.orderCode} ${order.origin === 'LOC' ? styles.codeLoc : styles.codePub}`}>
                            {order.code}
                          </span>
                          <span className={`${styles.elapsed} ${(isLate || isLong) ? styles.elapsedLate : ''}`}>
                            {(isLate || isLong) && <AlertTriangle size={11} aria-hidden />}
                            {fmtElapsed(secs)}
                          </span>
                        </div>

                        <div className={styles.zoneLine}>
                          <span className={styles.zoneText}>
                            {order.zone}{order.seat ? ` · Mesa ${order.seat}` : ''}
                          </span>
                          {order.user && (
                            <span className={styles.meseroTag}>{order.user.name}</span>
                          )}
                        </div>

                        {/* Items preview */}
                        <ul className={styles.itemsList} aria-label="Items">
                          {order.items.slice(0, 4).map((item) => (
                            <li key={item.id} className={styles.itemRow}>
                              <span className={styles.itemQty}>{item.qty}×</span>
                              <span className={styles.itemName}>{item.product.name}</span>
                            </li>
                          ))}
                          {order.items.length > 4 && (
                            <li className={styles.itemMore}>
                              +{order.items.length - 4} más
                            </li>
                          )}
                        </ul>

                        {/* Note */}
                        {order.note && (
                          <p className={styles.note}>{order.note}</p>
                        )}

                        {/* Footer: total + status */}
                        <div className={styles.cardFooter}>
                          <span className={styles.total}>
                            REF {order.total_usd.toFixed(2)}
                          </span>
                          <span className={`${styles.statusBadge} ${styles[`badge${status}`]}`}>
                            {status}
                          </span>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </main>
      )}
    </div>
  )
}
