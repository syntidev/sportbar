'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, Bell, ClipboardList, Plus, RefreshCw } from 'lucide-react'
import type { KitchenStatus, PaymentStatus, Zone } from '@/types'
import styles from './page.module.css'

// ── Types ─────────────────────────────────────────────────────────────────────

interface SessionUser {
  id:   number
  code: string
  role: string
}

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
  payment_status: PaymentStatus
  zone:           Zone
  seat:           string | null
  note:           string | null
  total_usd:      number
  created_at:     string
  created_by:     number
  items:          ComandaItem[]
  user:           { code: string; name: string } | null
}

type TabKey = 'activas' | 'listas' | 'entregadas' | 'cobradas'

// ── Constants ─────────────────────────────────────────────────────────────────

const POLL_MS = 8_000

// ── Helpers ───────────────────────────────────────────────────────────────────

function elapsedSecs(createdAt: string, now: Date): number {
  return Math.floor((now.getTime() - new Date(createdAt).getTime()) / 1000)
}

function fmtElapsed(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function timerClass(secs: number): string {
  if (secs < 180) return styles.timerGreen
  if (secs < 300) return styles.timerOrange
  return styles.timerRed
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ComandasPage() {
  const [me,           setMe]           = useState<SessionUser | null>(null)
  const [meseroName,   setMeseroName]   = useState<string | null>(null)
  const [activeOrders, setActiveOrders] = useState<ComandaOrder[]>([])
  const [delivOrders,  setDelivOrders]  = useState<ComandaOrder[]>([])
  const [tab,          setTab]          = useState<TabKey>('activas')
  const [now,          setNow]          = useState(() => new Date())
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [lastSync,     setLastSync]     = useState<Date | null>(null)
  const [syncSecs,     setSyncSecs]     = useState(0)
  const [delivering,   setDelivering]   = useState<Set<number>>(new Set())

  const meRef   = useRef<SessionUser | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const syncRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── 1s clock ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1_000)
    return () => clearInterval(t)
  }, [])

  // ── Sync counter (resets on each poll) ───────────────────────────────────

  useEffect(() => {
    if (!lastSync) return
    setSyncSecs(0)
    if (syncRef.current) clearInterval(syncRef.current)
    syncRef.current = setInterval(() => setSyncSecs((s) => s + 1), 1_000)
    return () => { if (syncRef.current) clearInterval(syncRef.current) }
  }, [lastSync])

  // ── Fetch me ──────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: { success: boolean; user?: SessionUser }) => {
        if (data.success && data.user) {
          const user = { ...data.user, id: Number(data.user.id) }
          setMe(user)
          meRef.current = user
        }
      })
      .catch(() => undefined)
  }, [])

  // ── Poll ──────────────────────────────────────────────────────────────────

  const poll = useCallback(async () => {
    const userId = meRef.current?.id ?? null

    try {
      const [r1, r2] = await Promise.all([
        fetch('/api/orders?status=active&limit=200',    { cache: 'no-store' }),
        fetch('/api/orders?status=ENTREGADO&limit=100', { cache: 'no-store' }),
      ])
      const [d1, d2] = await Promise.all([r1.json(), r2.json()])

      if (!d1.success) throw new Error(d1.error ?? 'Error al cargar')

      const allActive:    ComandaOrder[] = d1.orders ?? []
      const allDelivered: ComandaOrder[] = d2.success ? (d2.orders ?? []) : []

      const mine = (list: ComandaOrder[]) =>
        userId != null
          ? list.filter((o) => Number(o.created_by) === userId)
          : list

      const myActive    = mine(allActive).sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      )
      const myDelivered = mine(allDelivered).sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )

      setActiveOrders(myActive)
      setDelivOrders(myDelivered)

      if (!meseroName) {
        const n = myActive.find((o) => o.user)?.user?.name
               ?? myDelivered.find((o) => o.user)?.user?.name
        if (n) setMeseroName(n)
      }

      setError(null)
      setLastSync(new Date())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error de red')
    } finally {
      setLoading(false)
    }
  }, [meseroName])

  useEffect(() => {
    poll()
    pollRef.current = setInterval(poll, POLL_MS)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [poll])

  // ── ENTREGAR ──────────────────────────────────────────────────────────────

  async function handleEntregar(orderId: number) {
    if (!me) return
    setDelivering((prev) => new Set([...prev, orderId]))
    try {
      await fetch(`/api/orders/${orderId}/status`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ kitchen_status: 'ENTREGADO', actor_code: me.code }),
      })
      await poll()
    } finally {
      setDelivering((prev) => {
        const next = new Set(prev)
        next.delete(orderId)
        return next
      })
    }
  }

  // ── Tab groups ────────────────────────────────────────────────────────────

  const activas    = activeOrders.filter((o) => o.kitchen_status === 'NUEVO' || o.kitchen_status === 'PREP')
  const listas     = activeOrders.filter((o) => o.kitchen_status === 'LISTO')
  const entregadas = delivOrders.filter((o) => o.payment_status === 'PEND')
  const cobradas   = delivOrders.filter((o) => o.payment_status === 'PAID' || o.payment_status === 'CREDIT')

  const tabOrders: Record<TabKey, ComandaOrder[]> = { activas, listas, entregadas, cobradas }
  const current = tabOrders[tab]

  const totalActivas = activas.length + listas.length
  const displayName  = meseroName ?? me?.code ?? '…'

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/" className={styles.backBtn} aria-label="Volver al inicio">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <span className={styles.headerTitle}>Mis Comandas</span>
            <span className={styles.headerSub}>{displayName}</span>
          </div>
        </div>
        <div className={styles.headerRight}>
          {totalActivas > 0 && (
            <span className={styles.headerBadge} aria-label={`${totalActivas} órdenes activas`}>
              {totalActivas}
            </span>
          )}
          <span className={styles.syncLabel}>
            <RefreshCw size={10} aria-hidden />
            {lastSync
              ? syncSecs === 0 ? 'ahora' : `hace ${syncSecs}s`
              : '…'}
          </span>
        </div>
      </header>

      {/* ── Error ── */}
      {error && (
        <div className={styles.errorBanner} role="alert">
          <AlertTriangle size={14} aria-hidden />
          {error}
        </div>
      )}

      {/* ── Tabs sticky ── */}
      <nav className={styles.tabs} aria-label="Estado de órdenes">
        <button
          type="button"
          className={`${styles.tab} ${tab === 'activas' ? styles.tabActive : ''}`}
          onClick={() => setTab('activas')}
        >
          Activas
          {activas.length > 0 && <span className={styles.tabCount}>{activas.length}</span>}
        </button>

        <button
          type="button"
          className={[
            styles.tab,
            tab === 'listas' ? styles.tabActive : '',
            listas.length > 0 ? styles.tabListas : '',
          ].filter(Boolean).join(' ')}
          onClick={() => setTab('listas')}
        >
          <Bell size={13} aria-hidden />
          Listas
          {listas.length > 0 && (
            <span className={`${styles.tabCount} ${styles.tabCountPulse}`}>
              {listas.length}
            </span>
          )}
        </button>

        <button
          type="button"
          className={`${styles.tab} ${tab === 'entregadas' ? styles.tabActive : ''}`}
          onClick={() => setTab('entregadas')}
        >
          Entregadas
          {entregadas.length > 0 && <span className={styles.tabCount}>{entregadas.length}</span>}
        </button>

        <button
          type="button"
          className={`${styles.tab} ${tab === 'cobradas' ? styles.tabActive : ''}`}
          onClick={() => setTab('cobradas')}
        >
          Cobradas
          {cobradas.length > 0 && <span className={styles.tabCount}>{cobradas.length}</span>}
        </button>
      </nav>

      {/* ── LISTAS alert ── */}
      {tab === 'listas' && listas.length > 0 && (
        <div className={styles.listasBanner} role="status" aria-live="polite">
          <Bell size={14} aria-hidden />
          {listas.length === 1
            ? 'Tienes 1 orden lista para entregar'
            : `Tienes ${listas.length} órdenes listas para entregar`}
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className={styles.splash}>
          <span className={styles.spinner} aria-hidden />
          <span className={styles.splashText}>Cargando comandas…</span>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && current.length === 0 && (
        <div className={styles.splash}>
          <ClipboardList size={48} strokeWidth={1} className={styles.emptyIcon} aria-hidden />
          <span className={styles.splashText}>
            {tab === 'activas' || tab === 'listas'
              ? 'Sin pedidos activos — crea una nueva orden'
              : tab === 'entregadas'
              ? 'Sin entregas pendientes de cobro'
              : 'Sin órdenes cobradas recientes'}
          </span>
          {(tab === 'activas' || tab === 'listas') && (
            <Link href="/pos/nueva-orden" className={styles.emptyBtn}>
              <Plus size={15} aria-hidden />
              Crear nueva orden
            </Link>
          )}
        </div>
      )}

      {/* ── Card list ── */}
      {!loading && current.length > 0 && (
        <main className={styles.list}>
          {current.map((order) => {
            const secs         = elapsedSecs(order.created_at, now)
            const isListo      = order.kitchen_status === 'LISTO'
            const isEntregado  = order.kitchen_status === 'ENTREGADO'
            const isPaid       = order.payment_status === 'PAID' || order.payment_status === 'CREDIT'
            const isDelivering = delivering.has(order.id)

            return (
              <article
                key={order.id}
                className={[
                  styles.card,
                  isListo     ? styles.cardListo     : '',
                  isEntregado && !isPaid ? styles.cardEntregada : '',
                  isPaid      ? styles.cardCobrada   : '',
                ].filter(Boolean).join(' ')}
              >
                {/* ── Top row ── */}
                <div className={styles.cardTop}>
                  <div className={styles.cardTopLeft}>
                    <span className={`${styles.orderCode} ${order.origin === 'LOC' ? styles.codeLoc : styles.codePub}`}>
                      {order.code}
                    </span>
                    <span className={styles.zoneTag}>
                      {order.zone}{order.seat ? ` · ${order.seat}` : ''}
                    </span>
                  </div>
                  <div className={styles.cardTopRight}>
                    {!isEntregado && (
                      <span className={`${styles.timer} ${timerClass(secs)}`}
                        aria-label={`Tiempo: ${fmtElapsed(secs)}`}>
                        {fmtElapsed(secs)}
                      </span>
                    )}
                    <span className={[
                      styles.statusPill,
                      isListo       ? styles.pillListo     : '',
                      order.kitchen_status === 'NUEVO' ? styles.pillNuevo : '',
                      order.kitchen_status === 'PREP'  ? styles.pillPrep  : '',
                      isEntregado && !isPaid ? styles.pillEntregada : '',
                      isPaid ? (order.payment_status === 'CREDIT' ? styles.pillCredito : styles.pillPagado) : '',
                    ].filter(Boolean).join(' ')}>
                      {isPaid
                        ? order.payment_status === 'CREDIT' ? 'Fiado' : 'Cobrado'
                        : isEntregado ? 'Entregado'
                        : order.kitchen_status}
                    </span>
                  </div>
                </div>

                {/* ── Items ── */}
                <ul className={styles.itemsList} aria-label="Items">
                  {order.items.slice(0, 5).map((item) => (
                    <li key={item.id} className={styles.itemRow}>
                      <span className={styles.itemQty}>{item.qty}×</span>
                      <span className={styles.itemName}>{item.product.name}</span>
                    </li>
                  ))}
                  {order.items.length > 5 && (
                    <li className={styles.itemMore}>+{order.items.length - 5} más</li>
                  )}
                </ul>

                {order.note && (
                  <p className={styles.note}>{order.note}</p>
                )}

                {/* ── Footer ── */}
                <div className={styles.cardFooter}>
                  <span className={styles.total}>REF {Number(order.total_usd).toFixed(2)}</span>
                  {!isEntregado && (
                    <span className={styles.agoLabel}>hace {Math.floor(secs / 60)}m</span>
                  )}
                </div>

                {/* ── ENTREGAR button ── */}
                {isListo && (
                  <button
                    type="button"
                    className={styles.btnEntregar}
                    onClick={() => handleEntregar(order.id)}
                    disabled={isDelivering}
                    aria-label={`Marcar ${order.code} como entregado`}
                  >
                    {isDelivering
                      ? <><span className={styles.spinnerSm} aria-hidden />Entregando…</>
                      : 'ENTREGAR'}
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
