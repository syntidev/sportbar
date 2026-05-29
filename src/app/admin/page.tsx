'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, useSpring, useTransform, animate } from 'framer-motion'
import {
  AlertCircle, Clock, ShoppingBag, CreditCard,
  Banknote, Building2, Users, Timer,
  Settings, UserSquare2, Briefcase, CalendarDays,
} from 'lucide-react'
import type { KitchenStatus, PaymentStatus } from '@/types'
import styles from './page.module.css'

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrderSummary {
  id:             number
  code:           string
  zone:           string
  kitchen_status: KitchenStatus
  payment_status: PaymentStatus
  total_usd:      string
  created_at:     string
  venue_assigned: number | null
  user?:          { code: string; name: string }
}

interface VenueCard {
  id:       number
  name:     string
  type:     string
  is_active: boolean
  _count:   { users: number }
}

interface TeamUser {
  id:       number
  venue_id: number | null
  is_active: boolean
}

// ── Animated counter ──────────────────────────────────────────────────────────

function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const nodeRef = useRef<HTMLSpanElement>(null)
  const prev    = useRef(0)

  useEffect(() => {
    const node = nodeRef.current
    if (!node) return
    const from = prev.current
    prev.current = value
    const ctrl = animate(from, value, {
      duration: 0.6,
      ease:     [0.25, 0, 0, 1],
      onUpdate: (v) => {
        node.textContent = decimals > 0
          ? v.toFixed(decimals)
          : String(Math.round(v))
      },
    })
    return () => ctrl.stop()
  }, [value, decimals])

  return <span ref={nodeRef}>{decimals > 0 ? value.toFixed(decimals) : String(value)}</span>
}

// ── Live clock ─────────────────────────────────────────────────────────────────

function useClock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const fmt = () =>
      new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setTime(fmt())
    const id = setInterval(() => setTime(fmt()), 1000)
    return () => clearInterval(id)
  }, [])
  return time
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const KITCHEN_LABEL: Record<KitchenStatus, string> = {
  NUEVO:      'NUEVO',
  PREP:       'PREP',
  LISTO:      'LISTO',
  ENTREGADO:  'ENTREGADO',
}

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  PEND:      'PEND',
  PAID:      'PAGADO',
  CREDIT:    'CRÉDITO',
  CANCELLED: 'CANCEL',
}

function minutesAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (diff < 1)  return 'ahora'
  if (diff < 60) return `${diff} min`
  return `${Math.floor(diff / 60)}h`
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const clock = useClock()

  const [orders,  setOrders]  = useState<OrderSummary[]>([])
  const [venues,  setVenues]  = useState<VenueCard[]>([])
  const [users,   setUsers]   = useState<TeamUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    const abort = new AbortController()
    const s = abort.signal

    Promise.all([
      fetch('/api/orders?status=active&limit=100', { signal: s }).then((r) => r.json()),
      fetch('/api/venues',                         { signal: s }).then((r) => r.json()),
      fetch('/api/users',                          { signal: s }).then((r) => r.json()),
    ])
      .then(([od, vd, ud]) => {
        if (!od.success) throw new Error(od.error)
        if (!vd.success) throw new Error(vd.error)
        if (!ud.success) throw new Error(ud.error)
        setOrders(od.orders)
        setVenues(vd.venues)
        setUsers(ud.users)
      })
      .catch((e: unknown) => {
        if ((e as { name?: string }).name === 'AbortError') return
        setError(e instanceof Error ? e.message : 'Error al cargar dashboard')
      })
      .finally(() => setLoading(false))

    return () => abort.abort()
  }, [])

  // ── Stats ──────────────────────────────────────────────────────────────────

  const activeOrders  = orders.length
  const pendingPay    = orders.filter((o) => o.payment_status === 'PEND').length
  const openCredits   = orders.filter((o) => o.payment_status === 'CREDIT').length
  const totalRef      = orders.reduce((sum, o) => sum + parseFloat(o.total_usd), 0)

  const isEmpty = !loading && !error && orders.length === 0

  // ── Venue enrichment ────────────────────────────────────────────────────────

  const activeVenues = venues.filter((v) => v.is_active)

  const venueStats = activeVenues.map((v) => {
    const vOrders      = orders.filter((o) => o.venue_assigned === v.id)
    const activeStaff  = users.filter((u) => u.venue_id === v.id && u.is_active).length
    const lastOrder    = vOrders[0]
    return { ...v, vOrders: vOrders.length, activeStaff, lastOrder }
  })

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Partido en curso</h1>
          <div className={styles.livePill}>
            <span className={styles.liveDot} />
            En vivo
          </div>
        </div>
        <div className={styles.clock}>
          <Clock size={13} strokeWidth={2} aria-hidden />
          {clock}
        </div>
      </header>

      {/* ── Nav rápida ─────────────────────────────────────────────────── */}
      <nav className={styles.quickNav} aria-label="Secciones de administración">
        <Link href="/admin/perfil"    className={styles.navItem}>
          <UserSquare2 size={15} aria-hidden />
          Perfil
        </Link>
        <Link href="/admin/config"    className={styles.navItem}>
          <Settings size={15} aria-hidden />
          Config
        </Link>
        <Link href="/admin/equipo"    className={styles.navItem}>
          <Users size={15} aria-hidden />
          Equipo
        </Link>
        <Link href="/admin/turno"     className={styles.navItem}>
          <Briefcase size={15} aria-hidden />
          Turno
        </Link>
        <Link href="/admin/partido"   className={styles.navItem}>
          <CalendarDays size={15} aria-hidden />
          Partido
        </Link>
        <Link href="/admin/caja"      className={styles.navItem}>
          <Banknote size={15} aria-hidden />
          Caja
        </Link>
      </nav>

      {/* ── Loading ─────────────────────────────────────────────────────── */}
      {loading && (
        <div className={styles.state}>
          <span className={styles.spinner} />
          <span>Cargando dashboard…</span>
        </div>
      )}

      {/* ── Error ───────────────────────────────────────────────────────── */}
      {error && (
        <div className={`${styles.state} ${styles.stateError}`}>
          <AlertCircle size={18} aria-hidden />
          <span>{error}</span>
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {isEmpty && (
        <div className={styles.emptyState}>
          <ShoppingBag size={36} strokeWidth={1.2} className={styles.emptyIcon} aria-hidden />
          <p className={styles.emptyTitle}>Abre un turno para comenzar</p>
          <p className={styles.emptySubtitle}>Las órdenes aparecerán aquí en tiempo real</p>
        </div>
      )}

      {!loading && !error && !isEmpty && (
        <>
          {/* ── Stats row ──────────────────────────────────────────────── */}
          <div className={styles.statsRow}>
            <StatCard
              icon={ShoppingBag}
              label="Órdenes activas"
              value={activeOrders}
              colorVar="--color-primary"
            />
            <StatCard
              icon={CreditCard}
              label="Pendientes cobro"
              value={pendingPay}
              colorVar="--color-pendiente"
            />
            <StatCard
              icon={Banknote}
              label="Créditos abiertos"
              value={openCredits}
              colorVar="--color-credito"
            />
            <StatCard
              icon={Banknote}
              label="Total REF turno"
              value={totalRef}
              colorVar="--color-brand"
              decimals={2}
              prefix="REF "
            />
          </div>

          {/* ── Venue grid ─────────────────────────────────────────────── */}
          {venueStats.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <Building2 size={14} aria-hidden />
                Puntos de venta
              </h2>
              <div className={styles.venueGrid}>
                {venueStats.map((v) => (
                  <div key={v.id} className={styles.venueCard}>
                    <div className={styles.venueHeader}>
                      <span className={styles.venueName}>{v.name}</span>
                      <span className={styles.venueType}>{v.type}</span>
                    </div>
                    <div className={styles.venueStats}>
                      <div className={styles.venueStat}>
                        <span className={styles.venueStatValue}>
                          <AnimatedNumber value={v.vOrders} />
                        </span>
                        <span className={styles.venueStatLabel}>órdenes</span>
                      </div>
                      <div className={styles.venueStat}>
                        <span className={styles.venueStatValue}>
                          <AnimatedNumber value={v.activeStaff} />
                        </span>
                        <span className={styles.venueStatLabel}>
                          <Users size={10} aria-hidden /> personal
                        </span>
                      </div>
                    </div>
                    {v.lastOrder && (
                      <div className={styles.venueFooter}>
                        <Timer size={10} aria-hidden />
                        <span>Última orden: {minutesAgo(v.lastOrder.created_at)}</span>
                      </div>
                    )}
                    {!v.lastOrder && (
                      <div className={styles.venueFooter}>
                        <span className={styles.venueEmpty}>Sin órdenes activas</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Últimas órdenes ────────────────────────────────────────── */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <ShoppingBag size={14} aria-hidden />
              Últimas {Math.min(orders.length, 10)} órdenes
            </h2>
            <div className={styles.orderList}>
              {orders.slice(0, 10).map((o) => (
                <div key={o.id} className={styles.orderRow}>
                  <span className={styles.orderCode}>{o.code}</span>
                  <span className={styles.orderZone}>{o.zone}</span>
                  <span className={`${styles.orderBadge} ${styles[`kitchen_${o.kitchen_status}`]}`}>
                    {KITCHEN_LABEL[o.kitchen_status]}
                  </span>
                  <span className={`${styles.orderBadge} ${styles[`pay_${o.payment_status}`]}`}>
                    {PAYMENT_LABEL[o.payment_status]}
                  </span>
                  <span className={styles.orderTotal}>REF {parseFloat(o.total_usd).toFixed(2)}</span>
                  <span className={styles.orderTime}>{minutesAgo(o.created_at)}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, colorVar, decimals = 0, prefix = '',
}: {
  icon:      typeof ShoppingBag
  label:     string
  value:     number
  colorVar:  string
  decimals?: number
  prefix?:   string
}) {
  return (
    <motion.div
      className={styles.statCard}
      style={{ '--stat-color': `var(${colorVar})` } as React.CSSProperties}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0, 0, 1] }}
    >
      <div className={styles.statIcon}>
        <Icon size={16} strokeWidth={2} aria-hidden />
      </div>
      <div className={styles.statBody}>
        <span className={styles.statValue}>
          {prefix}<AnimatedNumber value={value} decimals={decimals} />
        </span>
        <span className={styles.statLabel}>{label}</span>
      </div>
    </motion.div>
  )
}
