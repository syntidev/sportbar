'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { animate } from 'framer-motion'
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  Bitcoin,
  Clock,
  CreditCard,
  DollarSign,
  Send,
  Smartphone,
  TrendingUp,
  Wallet,
  XCircle,
} from 'lucide-react'
import type { CajaData, MetodoPago, CreditoRow, CanceladaRow } from '@/app/api/caja/route'
import styles from './page.module.css'

// ── Animated number ───────────────────────────────────────────────────────────

function AnimNum({ value, decimals = 2, prefix = '' }: { value: number; decimals?: number; prefix?: string }) {
  const ref  = useRef<HTMLSpanElement>(null)
  const prev = useRef(0)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const from = prev.current
    prev.current = value
    const ctrl = animate(from, value, {
      duration: 0.65,
      ease: [0.25, 0, 0, 1],
      onUpdate: (v) => { node.textContent = prefix + v.toFixed(decimals) },
    })
    return () => ctrl.stop()
  }, [value, decimals, prefix])

  return <span ref={ref}>{prefix}{value.toFixed(decimals)}</span>
}

// ── Duration format ───────────────────────────────────────────────────────────

function fmtDuration(min: number): string {
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

// ── Method meta ───────────────────────────────────────────────────────────────

type MethodMeta = { icon: typeof Banknote; color: string }

const METHOD_META: Record<string, MethodMeta> = {
  'Pago Móvil': { icon: Smartphone,  color: '#4CAF50' },
  'Efectivo':   { icon: Banknote,    color: '#F5A623' },
  'Zelle':      { icon: Send,        color: '#00BCD4' },
  'Tarjeta':    { icon: CreditCard,  color: '#7C4DFF' },
  'Binance':    { icon: Bitcoin,     color: '#F0B90B' },
  'USDT':       { icon: DollarSign,  color: '#26A17B' },
  'Sin método': { icon: Wallet,      color: '#888' },
}

function getMethodMeta(method: string): MethodMeta {
  return METHOD_META[method] ?? { icon: TrendingUp, color: '#F5A623' }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CajaPage() {
  const [caja,    setCaja]    = useState<CajaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    fetch('/api/caja', { signal: ctrl.signal, cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { success: boolean; caja?: CajaData; error?: string }) => {
        if (!d.success) throw new Error(d.error ?? 'Error al cargar caja')
        setCaja(d.caja ?? null)
      })
      .catch((e: unknown) => {
        if ((e as { name?: string }).name === 'AbortError') return
        setError(e instanceof Error ? e.message : 'Error de red')
      })
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [])

  return (
    <div className={styles.page}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className={styles.header}>
        <Link href="/admin" className={styles.backBtn} aria-label="Volver al admin">
          <ArrowLeft size={16} />
        </Link>
        <div className={styles.headerText}>
          <span className={styles.pageTitle}>Caja</span>
          <span className={styles.pageSub}>Finanzas del turno activo</span>
        </div>
        {caja && (
          <div className={styles.headerRight}>
            <span className={styles.turnoName}>{caja.turno.partido_nombre}</span>
            <span className={styles.duration}>
              <Clock size={11} aria-hidden />
              {fmtDuration(caja.turno.duration_min)}
            </span>
          </div>
        )}
      </header>

      {/* ── Loading ─────────────────────────────────────────────────────────── */}
      {loading && (
        <div className={styles.state}>
          <span className={styles.spinner} aria-hidden />
          Cargando caja…
        </div>
      )}

      {/* ── Error ───────────────────────────────────────────────────────────── */}
      {error && (
        <div className={`${styles.state} ${styles.stateError}`} role="alert">
          <AlertCircle size={18} aria-hidden />
          {error}
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      {caja && (
        <>
          {/* ── Overview stats ────────────────────────────────────────────── */}
          <OverviewStats totales={caja.totales} />

          {/* ── Por método ────────────────────────────────────────────────── */}
          <section>
            <h2 className={styles.sectionTitle}>
              <Wallet size={13} aria-hidden />
              Cobros por método de pago
            </h2>
            {caja.por_metodo.length === 0 ? (
              <p className={styles.tableEmpty}>Sin cobros registrados aún</p>
            ) : (
              <div className={styles.methodGrid}>
                {caja.por_metodo.map((m) => (
                  <MethodCard key={m.method} data={m} />
                ))}
              </div>
            )}
          </section>

          {/* ── Créditos ──────────────────────────────────────────────────── */}
          <section>
            <h2 className={styles.sectionTitle}>
              <CreditCard size={13} aria-hidden />
              Créditos pendientes ({caja.creditos.length})
            </h2>
            <CreditosTable rows={caja.creditos} />
          </section>

          {/* ── Canceladas ────────────────────────────────────────────────── */}
          {caja.canceladas.length > 0 && (
            <section>
              <h2 className={styles.sectionTitle}>
                <XCircle size={13} aria-hidden />
                Órdenes canceladas ({caja.canceladas.length})
              </h2>
              <CanceladasList rows={caja.canceladas} />
            </section>
          )}

          {/* ── Gran total ────────────────────────────────────────────────── */}
          <GrandTotal caja={caja} />
        </>
      )}
    </div>
  )
}

// ── OverviewStats ─────────────────────────────────────────────────────────────

function OverviewStats({ totales }: { totales: CajaData['totales'] }) {
  return (
    <div className={styles.statsGrid}>
      <StatCard
        icon={Banknote}
        label="Cobrado"
        colorVar="--color-listo"
        valueNode={<AnimNum value={totales.cobrado_usd} prefix="REF " />}
        secondary={`Bs. ${totales.cobrado_bs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`}
      />
      <StatCard
        icon={CreditCard}
        label="En crédito"
        colorVar="--color-credito"
        valueNode={<AnimNum value={totales.credito_usd} prefix="REF " />}
        secondary={`Bs. ${totales.credito_bs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`}
      />
      <StatCard
        icon={Clock}
        label="Pendiente cobro"
        colorVar="--color-pendiente"
        valueNode={<AnimNum value={totales.pendiente_usd} prefix="REF " />}
        secondary={`Bs. ${totales.pendiente_bs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`}
      />
      <StatCard
        icon={Wallet}
        label="Órdenes válidas"
        colorVar="--color-brand"
        valueNode={<span>{totales.order_count}</span>}
        secondary={`REF ${totales.gran_total_usd.toFixed(2)} total`}
        valueSm
      />
    </div>
  )
}

function StatCard({
  icon: Icon, label, colorVar, valueNode, secondary, valueSm = false,
}: {
  icon:      typeof Banknote
  label:     string
  colorVar:  string
  valueNode: React.ReactNode
  secondary: string
  valueSm?:  boolean
}) {
  return (
    <div
      className={styles.statCard}
      style={{ '--stat-color': `var(${colorVar})` } as React.CSSProperties}
    >
      <div className={styles.statIcon}>
        <Icon size={14} strokeWidth={2} aria-hidden />
      </div>
      <div className={styles.statBody}>
        <span className={valueSm ? styles.statValueSm : styles.statValue}>{valueNode}</span>
        <span className={styles.statSecondary}>{secondary}</span>
        <span className={styles.statLabel}>{label}</span>
      </div>
    </div>
  )
}

// ── MethodCard ────────────────────────────────────────────────────────────────

function MethodCard({ data }: { data: MetodoPago }) {
  const meta = getMethodMeta(data.method)
  const Icon = meta.icon
  return (
    <div
      className={styles.methodCard}
      style={{ '--method-color': meta.color } as React.CSSProperties}
    >
      <div className={styles.methodHeader}>
        <span className={styles.methodName}>{data.method}</span>
        <Icon size={16} className={styles.methodIcon} aria-hidden />
      </div>
      <span className={styles.methodCount}>{data.count} orden{data.count !== 1 ? 'es' : ''}</span>
      <div className={styles.methodTotal}>
        <span className={styles.methodRef}>
          <AnimNum value={data.total_usd} prefix="REF " />
        </span>
        <span className={styles.methodBs}>
          Bs. {data.total_bs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  )
}

// ── CreditosTable ─────────────────────────────────────────────────────────────

function CreditosTable({ rows }: { rows: CreditoRow[] }) {
  return (
    <div className={styles.tableWrap} role="table" aria-label="Créditos pendientes">
      <div className={styles.tableHead} role="row">
        <span className={styles.thCell} role="columnheader">Cliente</span>
        <span className={styles.thCell} role="columnheader">Zona</span>
        <span className={styles.thCell} role="columnheader">Total</span>
        <span className={styles.thCell} role="columnheader">Estado</span>
      </div>
      <div className={styles.tableBody}>
        {rows.length === 0 && (
          <p className={styles.tableEmpty}>Sin créditos en este turno</p>
        )}
        {rows.map((r) => (
          <div key={r.id} className={styles.tableRow} role="row">
            <div className={styles.tdCustomer} role="cell">
              <span className={styles.customerName}>
                {r.customer_name} {r.customer_lastname}
              </span>
              {r.customer_id && (
                <span className={styles.customerId}>CI {r.customer_id}</span>
              )}
            </div>
            <span className={styles.tdZone} role="cell">
              {r.zone}{r.seat ? ` · ${r.seat}` : ''}
            </span>
            <div className={styles.tdTotal} role="cell">
              <span className={styles.totalRef}>REF {r.total_usd.toFixed(2)}</span>
              <span className={styles.totalBs}>
                Bs. {r.total_bs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <span role="cell">
              <span className={styles.creditBadge}>Fiado</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── CanceladasList ────────────────────────────────────────────────────────────

function CanceladasList({ rows }: { rows: CanceladaRow[] }) {
  return (
    <div className={styles.cancelList}>
      {rows.map((r) => (
        <div key={r.id} className={styles.cancelRow}>
          <span className={styles.cancelCode}>{r.code}</span>
          <span className={styles.cancelNote}>{r.note ?? r.customer_name}</span>
          <span className={styles.cancelTotal}>REF {r.total_usd.toFixed(2)}</span>
        </div>
      ))}
    </div>
  )
}

// ── GrandTotal ────────────────────────────────────────────────────────────────

function GrandTotal({ caja }: { caja: CajaData }) {
  const { totales } = caja
  return (
    <div className={styles.grandTotal}>
      <span className={styles.grandTotalTitle}>Resumen del turno — {caja.turno.partido_nombre}</span>

      <div className={styles.grandTotalGrid}>
        <div className={styles.gtItem}>
          <span className={styles.gtLabel}>Total vendido</span>
          <span className={`${styles.gtValue} ${styles.gtValueBrand}`}>
            REF <AnimNum value={totales.gran_total_usd} />
          </span>
          <span className={styles.gtValueSm}>
            Bs. {totales.gran_total_bs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className={styles.gtItem}>
          <span className={styles.gtLabel}>Cobrado</span>
          <span className={`${styles.gtValue} ${styles.gtValueGreen}`}>
            REF <AnimNum value={totales.cobrado_usd} />
          </span>
          <span className={styles.gtValueSm}>
            Bs. {totales.cobrado_bs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className={styles.gtItem}>
          <span className={styles.gtLabel}>Pendiente cobro</span>
          <span className={`${styles.gtValue} ${styles.gtValueOrange}`}>
            REF <AnimNum value={totales.pendiente_usd} />
          </span>
          <span className={styles.gtValueSm}>
            {totales.pendiente_usd === 0 ? 'Todo cobrado' : 'Sin cobrar aún'}
          </span>
        </div>

        <div className={styles.gtItem}>
          <span className={styles.gtLabel}>Créditos abiertos</span>
          <span className={`${styles.gtValue} ${styles.gtValuePurple}`}>
            REF <AnimNum value={totales.credito_usd} />
          </span>
          <span className={styles.gtValueSm}>
            {caja.creditos.length} cliente{caja.creditos.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className={styles.grandTotalDivider} />

      <div className={styles.grandTotalFinal}>
        <div className={styles.gtItem}>
          <span className={styles.gtFinalLabel}>Gran total del turno</span>
          <span className={styles.gtFinalRef}>
            REF <AnimNum value={totales.gran_total_usd} />
          </span>
          <span className={styles.gtFinalBs}>
            Bs. {totales.gran_total_bs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className={styles.gtItem} style={{ textAlign: 'right' }}>
          <span className={styles.gtLabel}>Duración del turno</span>
          <span className={`${styles.gtValue} ${styles.gtValueBrand}`}>
            {fmtDuration(caja.turno.duration_min)}
          </span>
          <span className={styles.gtValueSm}>{totales.order_count} órdenes válidas</span>
        </div>
      </div>
    </div>
  )
}
