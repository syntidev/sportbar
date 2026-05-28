'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { animate, motion } from 'framer-motion'
import {
  AlertCircle, AlertTriangle, ArrowLeft, BarChart2,
  Banknote, Clock, CreditCard, Hash, MapPin,
  ShoppingBag, Target, TrendingUp, Users, Zap,
} from 'lucide-react'
import type {
  PartidoData, TopProductoItem, VenueStats, AnomaliaOrden, TimelineHour,
} from '@/app/api/partido/[id]/route'
import styles from './page.module.css'

// ── Animated number ───────────────────────────────────────────────────────────

function AnimNum({
  value, decimals = 2, prefix = '', suffix = '',
}: {
  value: number; decimals?: number; prefix?: string; suffix?: string
}) {
  const ref  = useRef<HTMLSpanElement>(null)
  const prev = useRef(0)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const from = prev.current
    prev.current = value
    const ctrl = animate(from, value, {
      duration: 0.7,
      ease: [0.25, 0, 0, 1],
      onUpdate: (v) => {
        node.textContent = prefix + v.toFixed(decimals) + suffix
      },
    })
    return () => ctrl.stop()
  }, [value, decimals, prefix, suffix])

  return <span ref={ref}>{prefix}{value.toFixed(decimals)}{suffix}</span>
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('es-VE', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtDuration(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`
}

const CAT_LABEL: Record<string, string> = {
  hamburguesas: 'Hamburguesas',
  raciones:     'Raciones',
  bebidas:      'Bebidas',
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PartidoDetailPage({ params }: { params: { id: string } }) {
  const [data,    setData]    = useState<PartidoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    fetch(`/api/partido/${params.id}`, { signal: ctrl.signal, cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { success: boolean; partido?: PartidoData; error?: string }) => {
        if (!d.success) throw new Error(d.error ?? 'Error al cargar partido')
        setData(d.partido ?? null)
      })
      .catch((e: unknown) => {
        if ((e as { name?: string }).name === 'AbortError') return
        setError(e instanceof Error ? e.message : 'Error de red')
      })
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [params.id])

  return (
    <div className={styles.page}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className={styles.header}>
        <Link href="/admin/partido" className={styles.backBtn} aria-label="Volver a partidos">
          <ArrowLeft size={16} />
        </Link>
        <div className={styles.headerText}>
          <h1 className={styles.pageTitle}>
            {data ? data.meta.partido_nombre : 'Cargando…'}
          </h1>
          {data && (
            <div className={styles.pageMeta}>
              {data.meta.is_active && (
                <span className={styles.activeBadge}>
                  <span className={styles.activeDot} />
                  En curso
                </span>
              )}
              <span className={styles.metaChip}>
                <Clock size={10} aria-hidden />
                {fmtDate(data.meta.opened_at)}
              </span>
              <span className={styles.metaChip}>
                <Hash size={10} aria-hidden />
                {fmtDuration(data.meta.duration_min)}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* ── Loading ─────────────────────────────────────────────────────────── */}
      {loading && (
        <div className={styles.state}>
          <span className={styles.spinner} aria-hidden />
          Calculando estadísticas…
        </div>
      )}

      {/* ── Error ───────────────────────────────────────────────────────────── */}
      {error && (
        <div className={`${styles.state} ${styles.stateError}`} role="alert">
          <AlertCircle size={18} aria-hidden />
          {error}
        </div>
      )}

      {data && (
        <>
          {/* ─────────────────────────────────────────────────────────────── */}
          {/* SECCIÓN 1 — RESUMEN EJECUTIVO                                   */}
          {/* ─────────────────────────────────────────────────────────────── */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <Target size={13} aria-hidden />
              Resumen ejecutivo
            </h2>

            <div className={styles.statsGrid}>
              <StatCard
                icon={ShoppingBag}
                label="Órdenes"
                colorVar="--color-primary"
                valueNode={<AnimNum value={data.resumen.total_ordenes} decimals={0} />}
                sub={`Ticket avg REF ${data.resumen.ticket_avg_usd.toFixed(2)}`}
              />
              <StatCard
                icon={Banknote}
                label="Revenue"
                colorVar="--color-brand"
                valueNode={<AnimNum value={data.resumen.revenue_usd} prefix="REF " />}
                sub={`Bs. ${data.resumen.revenue_bs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`}
              />
              <StatCard
                icon={TrendingUp}
                label="Ticket promedio"
                colorVar="--color-listo"
                valueNode={<AnimNum value={data.resumen.ticket_avg_usd} prefix="REF " />}
                sub="por orden válida"
              />
              {data.resumen.orden_max && (
                <StatCard
                  icon={Zap}
                  label="Orden más alta"
                  colorVar="--color-nuevo"
                  valueNode={<AnimNum value={data.resumen.orden_max.total_usd} prefix="REF " />}
                  sub={data.resumen.orden_max.code}
                  valueSm
                />
              )}
              {data.resumen.avg_service_min !== null && (
                <StatCard
                  icon={Clock}
                  label="Servicio prom."
                  colorVar="--color-prep"
                  valueNode={<AnimNum value={data.resumen.avg_service_min} suffix=" min" />}
                  sub="de pedido a entrega"
                  valueSm
                />
              )}
            </div>

            {/* Origin split */}
            {data.resumen.total_ordenes > 0 && (
              <div className={styles.originBar}>
                <div className={styles.originBarTrack}>
                  <motion.div
                    className={styles.originBarPub}
                    initial={{ width: 0 }}
                    animate={{ width: `${data.resumen.pub_pct}%` }}
                    transition={{ duration: 0.7, ease: [0.25, 0, 0, 1] }}
                  />
                  <div className={styles.originBarLoc} />
                </div>
                <div className={styles.originLegend}>
                  <div className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ background: 'var(--color-brand)' }} />
                    QR Público
                    <span className={styles.legendValue}>
                      {data.resumen.pub_count} ({data.resumen.pub_pct}%)
                    </span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ background: 'var(--color-primary-light)' }} />
                    Mesero
                    <span className={styles.legendValue}>
                      {data.resumen.loc_count} ({data.resumen.loc_pct}%)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ─────────────────────────────────────────────────────────────── */}
          {/* SECCIÓN 2 — TOP PRODUCTOS                                       */}
          {/* ─────────────────────────────────────────────────────────────── */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <BarChart2 size={13} aria-hidden />
              Top productos
              {data.top_productos.top_categoria && (
                <span style={{ marginLeft: 'auto', fontWeight: 600, fontSize: '0.65rem', textTransform: 'none', letterSpacing: 0 }}>
                  Categoría líder: <strong>{CAT_LABEL[data.top_productos.top_categoria.category] ?? data.top_productos.top_categoria.category}</strong>
                </span>
              )}
            </h2>

            <div className={styles.twoCol}>
              <TopProductList
                title="Por cantidad vendida"
                items={data.top_productos.por_cantidad}
                mode="qty"
              />
              <TopProductList
                title="Por revenue REF"
                items={data.top_productos.por_revenue}
                mode="rev"
              />
            </div>
          </section>

          {/* ─────────────────────────────────────────────────────────────── */}
          {/* SECCIÓN 3 — RENDIMIENTO POR VENUE                               */}
          {/* ─────────────────────────────────────────────────────────────── */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <MapPin size={13} aria-hidden />
              Rendimiento por punto de venta
            </h2>
            <VenueTable rows={data.por_venue} />
          </section>

          {/* ─────────────────────────────────────────────────────────────── */}
          {/* SECCIÓN 4 — FRAUDE / ANOMALÍAS                                  */}
          {/* ─────────────────────────────────────────────────────────────── */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <AlertTriangle size={13} aria-hidden />
              Anomalías y fraude
            </h2>
            <AnomalyPanel anomalias={data.anomalias} />
          </section>

          {/* ─────────────────────────────────────────────────────────────── */}
          {/* SECCIÓN 5 — LÍNEA DE TIEMPO                                     */}
          {/* ─────────────────────────────────────────────────────────────── */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <TrendingUp size={13} aria-hidden />
              Línea de tiempo — órdenes por hora
            </h2>
            <TimelineChart timeline={data.timeline} peak={data.peak_hour} />
          </section>
        </>
      )}
    </div>
  )
}

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, colorVar, valueNode, sub, valueSm = false,
}: {
  icon:      typeof ShoppingBag
  label:     string
  colorVar:  string
  valueNode: React.ReactNode
  sub:       string
  valueSm?:  boolean
}) {
  return (
    <motion.div
      className={styles.statCard}
      style={{ '--stat-color': `var(${colorVar})` } as React.CSSProperties}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0, 0, 1] }}
    >
      <div className={styles.statIcon}>
        <Icon size={13} strokeWidth={2} aria-hidden />
      </div>
      <div className={styles.statBody}>
        <span className={valueSm ? styles.statValueSm : styles.statValue}>{valueNode}</span>
        <span className={styles.statSub}>{sub}</span>
        <span className={styles.statLabel}>{label}</span>
      </div>
    </motion.div>
  )
}

// ── TopProductList ────────────────────────────────────────────────────────────

function TopProductList({ title, items, mode }: { title: string; items: TopProductoItem[]; mode: 'qty' | 'rev' }) {
  if (items.length === 0) return null
  return (
    <div className={styles.productList}>
      <div className={styles.productListTitle}>{title}</div>
      {items.map((p, i) => (
        <div key={p.product_id} className={styles.productRow}>
          <span className={styles.productRank}>#{i + 1}</span>
          <div className={styles.productInfo}>
            <span className={styles.productName}>{p.name}</span>
            <span className={styles.productCat}>{CAT_LABEL[p.category] ?? p.category}</span>
          </div>
          {mode === 'qty' ? (
            <>
              <span className={styles.productStat}>{p.qty} u.</span>
              <span className={styles.productStatSm}>REF {p.revenue_usd.toFixed(2)}</span>
            </>
          ) : (
            <>
              <span className={styles.productStat}>REF {p.revenue_usd.toFixed(2)}</span>
              <span className={styles.productStatSm}>{p.qty} u.</span>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

// ── VenueTable ────────────────────────────────────────────────────────────────

function VenueTable({ rows }: { rows: VenueStats[] }) {
  if (rows.length === 0) {
    return <p className={styles.emptyAnomaly}>Sin datos de venue en este turno</p>
  }
  return (
    <div className={styles.venueTable} role="table" aria-label="Rendimiento por venue">
      <div className={styles.venueHead} role="row">
        <span className={styles.thCell} role="columnheader">Punto</span>
        <span className={styles.thCell} role="columnheader">Órdenes</span>
        <span className={styles.thCell} role="columnheader">Revenue</span>
        <span className={styles.thCell} role="columnheader">Tiempo prom.</span>
      </div>
      {rows.map((v) => (
        <div key={String(v.venue_id)} className={styles.venueRow} role="row">
          <span className={styles.venueName} role="cell">{v.label}</span>
          <span className={styles.venueCount} role="cell">{v.order_count}</span>
          <span className={styles.venueRevenue} role="cell">REF {v.revenue_usd.toFixed(2)}</span>
          <span
            className={`${styles.venueTime} ${v.avg_service_min === null ? styles.venueTimeNull : ''}`}
            role="cell"
          >
            {v.avg_service_min !== null ? `${v.avg_service_min.toFixed(1)} min` : '—'}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── AnomalyPanel ──────────────────────────────────────────────────────────────

function AnomalyPanel({ anomalias }: { anomalias: PartidoData['anomalias'] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <AnomalyGroup
        title={`Canceladas (${anomalias.canceladas.length})`}
        icon={<AlertCircle size={11} aria-hidden />}
        rows={anomalias.canceladas}
        variant="canceladas"
        emptyText="Sin órdenes canceladas"
      />
      <AnomalyGroup
        title={`Créditos sin cobrar (${anomalias.creditos.length})`}
        icon={<CreditCard size={11} aria-hidden />}
        rows={anomalias.creditos}
        variant="creditos"
        emptyText="Sin créditos abiertos"
      />
      <AnomalyGroup
        title={`Sin venue asignado (${anomalias.sin_venue.length})`}
        icon={<Users size={11} aria-hidden />}
        rows={anomalias.sin_venue}
        variant="sin_venue"
        emptyText="Todas las órdenes tienen venue"
      />
    </div>
  )
}

function AnomalyGroup({
  title, icon, rows, variant, emptyText,
}: {
  title:     string
  icon:      React.ReactNode
  rows:      AnomaliaOrden[]
  variant:   'canceladas' | 'creditos' | 'sin_venue'
  emptyText: string
}) {
  const rowClass =
    variant === 'canceladas' ? styles.anomalyCancelled :
    variant === 'creditos'   ? styles.anomalyCredit    :
                               styles.anomalyNoVenue

  const totalColor =
    variant === 'canceladas' ? 'var(--color-cancelado)' :
    variant === 'creditos'   ? 'var(--color-credito)'   :
                               'var(--color-pendiente)'

  return (
    <div className={styles.anomalyGroup}>
      <span className={styles.anomalyGroupTitle}>{icon}{title}</span>
      {rows.length === 0
        ? <p className={styles.emptyAnomaly}>{emptyText}</p>
        : rows.map((r) => (
            <div key={r.id} className={`${styles.anomalyRow} ${rowClass}`}>
              <div className={styles.anomalyLeft}>
                <span className={styles.anomalyCode}>{r.code}</span>
                <span className={styles.anomalyCustomer}>{r.customer_name}</span>
                {r.note && <span className={styles.anomalyNote}>{r.note}</span>}
                {r.actor_code && <span className={styles.anomalyActor}>{r.actor_code}</span>}
              </div>
              <div className={styles.anomalyRight}>
                <span className={styles.anomalyTotal} style={{ color: totalColor }}>
                  REF {r.total_usd.toFixed(2)}
                </span>
                <span className={styles.anomalyZone}>{r.zone}</span>
              </div>
            </div>
          ))
      }
    </div>
  )
}

// ── TimelineChart ─────────────────────────────────────────────────────────────

function TimelineChart({ timeline, peak }: { timeline: TimelineHour[]; peak: TimelineHour | null }) {
  const max = Math.max(...timeline.map((t) => t.count), 1)

  if (timeline.length === 0) {
    return (
      <div className={styles.timeline}>
        <p className={styles.timelineEmpty}>Sin datos de timeline en este turno</p>
      </div>
    )
  }

  return (
    <div className={styles.timeline}>
      {peak && (
        <span className={styles.peakChip}>
          <Zap size={10} aria-hidden />
          Pico: {peak.label} — {peak.count} orden{peak.count !== 1 ? 'es' : ''}
        </span>
      )}
      <div className={styles.timelineTitle}>Órdenes por hora</div>
      <div className={styles.chartRows}>
        {timeline.map((t) => {
          const pct    = (t.count / max) * 100
          const isPeak = peak?.hour === t.hour
          return (
            <div key={t.hour} className={styles.chartRow}>
              <span className={styles.chartLabel}>{t.label}</span>
              <div className={styles.chartTrack}>
                <motion.div
                  className={`${styles.chartBar} ${isPeak ? styles.peak : ''}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, ease: [0.25, 0, 0, 1], delay: 0.05 }}
                >
                  {t.count > 0 && (
                    <span className={styles.chartCount}>{t.count}</span>
                  )}
                </motion.div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
