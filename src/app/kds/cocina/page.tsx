'use client'

// src/app/kds/cocina/page.tsx
// KDS Cocina — Hamburguesas + Raciones
// Colores: verde NUEVO, naranja overflow 45s, rojo emergency 90s
// Claim system: TOMAR → BUMP (INICIAR PREP) → MARCAR LISTO

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertTriangle, ArrowLeft, ChefHat, Hand, RefreshCw, StickyNote, Zap,
} from 'lucide-react'
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
  venue_assigned: number | null
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
const OVERFLOW_SECS                = 45   // naranja
const EMERGENCY_SECS               = 90   // rojo parpadeante

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

async function fetchOrders(): Promise<{ orders: KdsOrder[]; myVenueId: number | null }> {
  const res  = await fetch('/api/kds?status=active', { cache: 'no-store' })
  const data = await res.json() as { success: boolean; orders?: KdsOrder[]; myVenueId?: number | null; error?: string }
  if (!data.success) throw new Error(data.error ?? 'Error KDS')

  const orders = (data.orders ?? [])
    .map((o) => ({
      ...o,
      items: o.items.filter((i) => FOOD_CATEGORIES.includes(i.product.category)),
    }))
    .filter((o) => o.items.length > 0)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  return { orders, myVenueId: data.myVenueId ?? null }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function KdsCocinaPage() {
  const [orders,    setOrders]    = useState<KdsOrder[]>([])
  const [myVenueId, setMyVenueId] = useState<number | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [bumping,   setBumping]   = useState<Set<number>>(new Set())
  const [claiming,  setClaiming]  = useState<Set<number>>(new Set())
  const [now,       setNow]       = useState(() => new Date())
  const [lastSync,  setLastSync]  = useState<Date | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 1 s clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1_000)
    return () => clearInterval(t)
  }, [])

  // poll
  const poll = useCallback(async () => {
    try {
      const { orders: data, myVenueId: vid } = await fetchOrders()
      setOrders(data)
      setMyVenueId(vid)
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

  // claim
  async function handleClaim(order: KdsOrder) {
    if (claiming.has(order.id)) return
    setClaiming((prev) => new Set(prev).add(order.id))
    try {
      const res  = await fetch(`/api/orders/${order.id}/claim`, { method: 'PATCH' })
      const data = await res.json() as { success: boolean; venue_id?: number; error?: string }
      if (!data.success) throw new Error(data.error)
      setOrders((prev) =>
        prev.map((o) => o.id === order.id ? { ...o, venue_assigned: data.venue_id ?? null } : o),
      )
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al tomar orden')
    } finally {
      setClaiming((prev) => { const n = new Set(prev); n.delete(order.id); return n })
    }
  }

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
      const data = await res.json() as { success: boolean; error?: string }
      if (!data.success) throw new Error(data.error)

      if (order.kitchen_status === 'NUEVO') {
        setOrders((prev) =>
          prev.map((o) => o.id === order.id ? { ...o, kitchen_status: 'PREP' as FoodStatus } : o),
        )
      } else {
        setOrders((prev) => prev.filter((o) => o.id !== order.id))
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al hacer bump')
    } finally {
      setBumping((prev) => { const n = new Set(prev); n.delete(order.id); return n })
    }
  }

  const nuevoCount = orders.filter((o) => o.kitchen_status === 'NUEVO').length
  const prepCount  = orders.filter((o) => o.kitchen_status === 'PREP').length

  return (
    <div className={styles.page}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/admin" className={styles.dashboardBtn} aria-label="Volver al dashboard">
            <ArrowLeft size={14} strokeWidth={2.5} aria-hidden />
            Dashboard
          </Link>
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
            const secs        = elapsedSecs(order.created_at, now)
            const isOverflow  = order.kitchen_status === 'NUEVO' && secs >= OVERFLOW_SECS && secs < EMERGENCY_SECS
            const isEmergency = order.kitchen_status === 'NUEVO' && secs >= EMERGENCY_SECS
            const isNuevo     = order.kitchen_status === 'NUEVO'
            const isClaimed   = order.venue_assigned !== null
            const isMyOrder   = myVenueId !== null
              ? order.venue_assigned === myVenueId
              : order.venue_assigned === -1
            const isBusy     = bumping.has(order.id)
            const isClaiming = claiming.has(order.id)

            const cardCls = [
              styles.card,
              isNuevo ? styles.cardNuevo : styles.cardPrep,
              isOverflow  ? styles.cardOverflow  : '',
              isEmergency ? styles.cardEmergency : '',
            ].filter(Boolean).join(' ')

            return (
              <article key={order.id} className={cardCls}>

                {/* Header row */}
                <div className={styles.cardHeader}>
                  <div className={styles.cardLeft}>
                    <span className={`${styles.orderCode} ${order.origin === 'LOC' ? styles.codeLoc : styles.codePub}`}>
                      {order.code}
                    </span>
                    <span className={styles.zoneLabel}>
                      {order.zone}{order.seat ? ` · ${order.seat}` : ''}
                    </span>
                  </div>

                  <div className={styles.cardRight}>
                    <span
                      className={[
                        styles.elapsed,
                        isOverflow  ? styles.elapsedOverflow  : '',
                        isEmergency ? styles.elapsedEmergency : '',
                      ].filter(Boolean).join(' ')}
                      aria-live="polite"
                    >
                      {isEmergency && <Zap size={13} aria-hidden />}
                      {isOverflow  && <AlertTriangle size={13} aria-hidden />}
                      {fmtElapsed(secs)}
                    </span>
                  </div>
                </div>

                {/* Claim banner */}
                {isClaimed && isMyOrder && (
                  <div className={styles.myClaimBanner}>
                    <Hand size={11} aria-hidden />
                    Esta estación
                  </div>
                )}
                {isClaimed && !isMyOrder && (
                  <div className={styles.claimedBanner}>
                    Tomado por otra estación
                  </div>
                )}

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

                {/* NUEVO unclaimed → TOMAR */}
                {isNuevo && !isClaimed && (
                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.claimBtn}`}
                    onClick={() => handleClaim(order)}
                    disabled={isClaiming}
                    aria-busy={isClaiming}
                    aria-label={`Tomar orden ${order.code}`}
                  >
                    <Hand size={16} aria-hidden />
                    {isClaiming ? 'Tomando…' : 'TOMAR'}
                  </button>
                )}

                {/* NUEVO claimed by another → disabled */}
                {isNuevo && isClaimed && !isMyOrder && (
                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.takenBtn}`}
                    disabled
                    aria-label="Orden tomada por otra estación"
                  >
                    Tomado por otra estación
                  </button>
                )}

                {/* NUEVO claimed by me → BUMP INICIAR PREP */}
                {isNuevo && isClaimed && isMyOrder && (
                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.bumpBtn}`}
                    onClick={() => handleBump(order)}
                    disabled={isBusy}
                    aria-busy={isBusy}
                    aria-label={`${BUMP_LABEL.NUEVO} — ${order.code}`}
                  >
                    {isBusy ? 'Actualizando…' : BUMP_LABEL.NUEVO}
                  </button>
                )}

                {/* PREP → MARCAR LISTO (cualquier estación) */}
                {!isNuevo && (
                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.bumpBtn}`}
                    onClick={() => handleBump(order)}
                    disabled={isBusy}
                    aria-busy={isBusy}
                    aria-label={`${BUMP_LABEL.PREP} — ${order.code}`}
                  >
                    {isBusy ? 'Actualizando…' : BUMP_LABEL.PREP}
                  </button>
                )}

              </article>
            )
          })}
        </main>
      )}
    </div>
  )
}
