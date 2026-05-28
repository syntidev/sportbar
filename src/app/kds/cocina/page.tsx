'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, ChefHat, RefreshCw, StickyNote } from 'lucide-react'
import type { Category } from '@/types'
import styles from './page.module.css'

// ── Types ─────────────────────────────────────────────────────────────────────

type FoodStatus = 'NUEVO' | 'PREP'

interface KdsProduct {
  id:       number
  name:     string
  category: Category
}

interface KdsItem {
  id:      number
  qty:     number
  product: KdsProduct
}

interface KdsOrder {
  id:             number
  code:           string
  origin:         'PUB' | 'LOC'
  kitchen_status: FoodStatus
  zone:           string
  seat:           string | null
  note:           string | null
  created_at:     string
  items:          KdsItem[]
  user:           { code: string; name: string } | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FOOD_CATEGORIES: Category[] = ['hamburguesas', 'raciones']
const ACTOR_CODE                   = 'KDS-COC'
const POLL_MS                      = 10_000
const ALERT_SECS                   = 300   // 5 min

const BUMP_LABEL: Record<FoodStatus, string> = {
  NUEVO: 'INICIAR PREPARACIÓN',
  PREP:  'MARCAR LISTO',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function elapsedSecs(createdAt: string, now: Date): number {
  return Math.floor((now.getTime() - new Date(createdAt).getTime()) / 1000)
}

function fmtElapsed(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

async function fetchKitchenOrders(): Promise<KdsOrder[]> {
  const [r1, r2] = await Promise.all([
    fetch('/api/orders?status=NUEVO', { cache: 'no-store' }),
    fetch('/api/orders?status=PREP',  { cache: 'no-store' }),
  ])
  const [d1, d2] = await Promise.all([r1.json(), r2.json()])

  const raw: KdsOrder[] = [
    ...(d1.success ? d1.orders : []),
    ...(d2.success ? d2.orders : []),
  ]

  // Deduplicate
  const seen = new Set<number>()
  return raw
    .filter((o) => { if (seen.has(o.id)) return false; seen.add(o.id); return true })
    .map((o) => ({ ...o, items: o.items.filter((i) => FOOD_CATEGORIES.includes(i.product.category)) }))
    .filter((o) => o.items.length > 0)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function KdsCocinaPage() {
  const [orders,   setOrders]   = useState<KdsOrder[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [bumping,  setBumping]  = useState<Set<number>>(new Set())
  const [now,      setNow]      = useState(() => new Date())
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // clock — 1 s tick
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1_000)
    return () => clearInterval(t)
  }, [])

  // poll — every 10 s
  const poll = useCallback(async () => {
    try {
      const data = await fetchKitchenOrders()
      setOrders(data)
      setError(null)
      setLastSync(new Date())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error de red al cargar comandas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    poll()
    pollRef.current = setInterval(poll, POLL_MS)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [poll])

  // bump
  async function handleBump(order: KdsOrder) {
    if (bumping.has(order.id)) return
    setBumping((prev) => new Set(prev).add(order.id))
    try {
      const res  = await fetch('/api/kds/bump', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ order_id: order.id, actor_code: ACTOR_CODE }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      if (order.kitchen_status === 'NUEVO') {
        // advance to PREP locally
        setOrders((prev) =>
          prev.map((o) => o.id === order.id ? { ...o, kitchen_status: 'PREP' as FoodStatus } : o),
        )
      } else {
        // LISTO — remove from view
        setOrders((prev) => prev.filter((o) => o.id !== order.id))
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al hacer bump')
    } finally {
      setBumping((prev) => { const n = new Set(prev); n.delete(order.id); return n })
    }
  }

  // counts
  const nuevoCount = orders.filter((o) => o.kitchen_status === 'NUEVO').length
  const prepCount  = orders.filter((o) => o.kitchen_status === 'PREP').length

  return (
    <div className={styles.page}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <ChefHat size={22} strokeWidth={2} aria-hidden />
          <div>
            <span className={styles.headerTitle}>KDS Cocina</span>
            <span className={styles.headerSub}>Hamburguesas · Raciones</span>
          </div>
        </div>

        <div className={styles.headerCenter}>
          <span className={`${styles.pill} ${styles.pillNuevo}`}>
            {nuevoCount} NUEVO{nuevoCount !== 1 ? 'S' : ''}
          </span>
          <span className={`${styles.pill} ${styles.pillPrep}`}>
            {prepCount} EN PREP
          </span>
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

      {/* ── Error banner ────────────────────────────────────────────────────── */}
      {error && (
        <div className={styles.errorBanner} role="alert">
          <AlertTriangle size={15} aria-hidden />
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
      {!loading && orders.length === 0 && !error && (
        <div className={styles.splash}>
          <ChefHat size={56} strokeWidth={1} className={styles.emptyIcon} aria-hidden />
          <span className={styles.splashText}>Sin comandas pendientes</span>
        </div>
      )}

      {/* ── Cards ───────────────────────────────────────────────────────────── */}
      {!loading && orders.length > 0 && (
        <main className={styles.grid} aria-label="Comandas de cocina">
          {orders.map((order) => {
            const secs    = elapsedSecs(order.created_at, now)
            const isAlert = secs >= ALERT_SECS
            const isBusy  = bumping.has(order.id)
            const isNuevo = order.kitchen_status === 'NUEVO'

            return (
              <article
                key={order.id}
                className={[
                  styles.card,
                  isNuevo ? styles.cardNuevo : styles.cardPrep,
                  isAlert  ? styles.cardAlert  : '',
                ].join(' ')}
              >
                {/* Header row */}
                <div className={styles.cardHeader}>
                  <div className={styles.cardLeft}>
                    <span className={`${styles.orderCode} ${order.origin === 'LOC' ? styles.codeLoc : styles.codePub}`}>
                      {order.code}
                    </span>
                    <span className={styles.zoneLabel}>
                      {order.zone}{order.seat ? ` · Mesa ${order.seat}` : ''}
                    </span>
                  </div>

                  <div className={styles.cardRight}>
                    <span className={`${styles.statusBadge} ${isNuevo ? styles.badgeNuevo : styles.badgePrep}`}>
                      {order.kitchen_status}
                    </span>
                    <span className={`${styles.elapsed} ${isAlert ? styles.elapsedAlert : ''}`} aria-live="polite">
                      {isAlert && <AlertTriangle size={13} aria-hidden />}
                      {fmtElapsed(secs)}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <ul className={styles.itemsList} aria-label="Ítems">
                  {order.items.map((item) => (
                    <li key={item.id} className={styles.itemRow}>
                      <span className={styles.itemQty}>{item.qty}×</span>
                      <span className={styles.itemName}>{item.product.name}</span>
                    </li>
                  ))}
                </ul>

                {/* Note */}
                {order.note && (
                  <p className={styles.note}>
                    <StickyNote size={12} aria-hidden />
                    {order.note}
                  </p>
                )}

                {/* Bump */}
                <button
                  type="button"
                  className={styles.bumpBtn}
                  onClick={() => handleBump(order)}
                  disabled={isBusy}
                  aria-busy={isBusy}
                  aria-label={`${BUMP_LABEL[order.kitchen_status]} — ${order.code}`}
                >
                  {isBusy ? 'Actualizando…' : BUMP_LABEL[order.kitchen_status]}
                </button>
              </article>
            )
          })}
        </main>
      )}
    </div>
  )
}

