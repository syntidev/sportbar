'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { AlertCircle, ArrowLeft, ArrowRight, Calendar, Clock, Trophy } from 'lucide-react'
import type { PartidoListItem } from '@/app/api/partido/route'
import styles from './page.module.css'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-VE', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
}

function fmtDuration(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PartidoListPage() {
  const [partidos, setPartidos] = useState<PartidoListItem[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    fetch('/api/partido', { signal: ctrl.signal, cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { success: boolean; partidos?: PartidoListItem[]; error?: string }) => {
        if (!d.success) throw new Error(d.error ?? 'Error al cargar partidos')
        setPartidos(d.partidos ?? [])
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
          <span className={styles.pageTitle}>Partidos</span>
          <span className={styles.pageSub}>Histórico de turnos · Post-match autopsy</span>
        </div>
      </header>

      {/* ── Loading ─────────────────────────────────────────────────────────── */}
      {loading && (
        <div className={styles.state}>
          <span className={styles.spinner} aria-hidden />
          Cargando partidos…
        </div>
      )}

      {/* ── Error ───────────────────────────────────────────────────────────── */}
      {error && (
        <div className={`${styles.state} ${styles.stateError}`} role="alert">
          <AlertCircle size={18} aria-hidden />
          {error}
        </div>
      )}

      {/* ── Empty ───────────────────────────────────────────────────────────── */}
      {!loading && !error && partidos.length === 0 && (
        <div className={styles.empty}>
          <Trophy size={44} strokeWidth={1} className={styles.emptyIcon} aria-hidden />
          <p className={styles.emptyTitle}>Sin partidos registrados</p>
          <p className={styles.emptySub}>Abre un turno desde la sección Turno para comenzar</p>
        </div>
      )}

      {/* ── List ────────────────────────────────────────────────────────────── */}
      {!loading && partidos.length > 0 && (
        <div className={styles.list} role="list">
          {partidos.map((p, i) => (
            <motion.div
              key={p.config_id}
              role="listitem"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.05, ease: [0.25, 0, 0, 1] }}
            >
              <Link
                href={`/admin/partido/${p.config_id}`}
                className={`${styles.card} ${p.is_active ? styles.active : styles.closed}`}
              >
                <div className={styles.cardAccent} />

                <div className={styles.cardBody}>
                  <div className={styles.cardTop}>
                    <span className={styles.cardName}>{p.partido_nombre}</span>
                    {p.is_active
                      ? (
                        <span className={styles.activeBadge}>
                          <span className={styles.activeDot} />
                          En curso
                        </span>
                      )
                      : (
                        <span className={styles.closedBadge}>Cerrado</span>
                      )
                    }
                  </div>

                  <div className={styles.cardMeta}>
                    <span className={styles.metaItem}>
                      <Calendar size={10} aria-hidden />
                      {fmtDate(p.opened_at)}
                    </span>
                    <span className={styles.metaItem}>
                      <Clock size={10} aria-hidden />
                      {fmtTime(p.opened_at)}
                      {p.closed_at ? ` → ${fmtTime(p.closed_at)}` : ' → ahora'}
                    </span>
                    <span className={styles.metaItem}>
                      <Trophy size={10} aria-hidden />
                      {fmtDuration(p.duration_min)}
                    </span>
                  </div>
                </div>

                <div className={styles.cardRight}>
                  <ArrowRight size={16} className={styles.arrowIcon} aria-hidden />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
