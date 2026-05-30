'use client'

import { useEffect, useRef, useState } from 'react'
import type { SimStatus, SimEvent, Intensity } from '@/lib/simulator'
import styles from './page.module.css'

type UIStatus = 'idle' | 'running' | 'paused'

interface StatusPayload extends SimStatus {
  log: SimEvent[]
}

interface VenueBar {
  name:  string
  count: number
  pct:   number
}

const INTENSITY_LABELS: Record<Intensity, string> = {
  tranquilo: 'Tranquilo',
  normal:    'Normal',
  lleno:     'Lleno',
  sold_out:  'Sold Out',
}

const DURATION_OPTIONS = [5, 10, 15, 30, 60] as const

export default function SimulatorPage() {
  const [status, setStatus]       = useState<StatusPayload | null>(null)
  const [intensity, setIntensity] = useState<Intensity>('normal')
  const [duration, setDuration]   = useState<number>(30)
  const [loading, setLoading]     = useState(false)
  const intervalRef               = useRef<ReturnType<typeof setInterval> | null>(null)

  function uiStatus(): UIStatus {
    if (!status) return 'idle'
    if (status.running && !status.paused) return 'running'
    if (status.running && status.paused)  return 'paused'
    return 'idle'
  }

  async function fetchStatus() {
    try {
      const res = await fetch('/api/simulate/status')
      const data = await res.json() as { success: boolean } & StatusPayload
      if (data.success) setStatus(data)
    } catch { /* ignore */ }
  }

  useEffect(() => {
    void fetchStatus()
    intervalRef.current = setInterval(() => { void fetchStatus() }, 2_000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  async function control(action: 'pause' | 'resume' | 'reset') {
    setLoading(true)
    try {
      await fetch('/api/simulate/control', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action }),
      })
      await fetchStatus()
    } finally {
      setLoading(false)
    }
  }

  async function start() {
    setLoading(true)
    try {
      await fetch('/api/simulate/run', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ intensity, duration_minutes: duration }),
      })
      await fetchStatus()
    } finally {
      setLoading(false)
    }
  }

  async function stop() {
    setLoading(true)
    try {
      await fetch('/api/simulate/stop', { method: 'POST' })
      await fetchStatus()
    } finally {
      setLoading(false)
    }
  }

  const ui = uiStatus()

  const venueBars: VenueBar[] = status
    ? (() => {
        const entries = Object.entries(status.orders_per_venue)
        if (entries.length === 0) return []
        const max = Math.max(...entries.map(([, v]) => v), 1)
        return entries
          .map(([name, count]) => ({ name, count, pct: Math.round((count / max) * 100) }))
          .sort((a, b) => b.count - a.count)
      })()
    : []

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.header}>
        <div className={`${styles.statusDot} ${ui !== 'idle' ? styles[ui] : ''}`} />
        <h1 className={styles.title}>Simulador de Carga</h1>
        <span className={styles.statusDotLabel}>
          {ui === 'idle' ? 'Detenido' : ui === 'running' ? 'En ejecución' : 'Pausado'}
          {status?.intensity ? ` · ${INTENSITY_LABELS[status.intensity]}` : ''}
        </span>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.selectGroup}>
          <span className={styles.selectLabel}>Intensidad</span>
          <select
            className={styles.select}
            value={intensity}
            disabled={ui !== 'idle' || loading}
            onChange={(e) => setIntensity(e.target.value as Intensity)}
          >
            {(Object.keys(INTENSITY_LABELS) as Intensity[]).map((k) => (
              <option key={k} value={k}>{INTENSITY_LABELS[k]}</option>
            ))}
          </select>
        </div>

        <div className={styles.selectGroup}>
          <span className={styles.selectLabel}>Duración</span>
          <select
            className={styles.select}
            value={duration}
            disabled={ui !== 'idle' || loading}
            onChange={(e) => setDuration(Number(e.target.value))}
          >
            {DURATION_OPTIONS.map((d) => (
              <option key={d} value={d}>{d} min</option>
            ))}
          </select>
        </div>

        <div className={styles.btnGroup}>
          {ui === 'paused' ? (
            <button className={`${styles.btn} ${styles.btnStart}`} disabled={loading} onClick={() => void control('resume')}>
              REANUDAR
            </button>
          ) : (
            <button className={`${styles.btn} ${styles.btnStart}`} disabled={ui !== 'idle' || loading} onClick={() => void start()}>
              INICIAR
            </button>
          )}
          <button className={`${styles.btn} ${styles.btnPause}`} disabled={ui !== 'running' || loading} onClick={() => void control('pause')}>
            PAUSAR
          </button>
          <button className={`${styles.btn} ${styles.btnStop}`}  disabled={ui === 'idle' || loading} onClick={() => void stop()}>
            DETENER
          </button>
          <button className={`${styles.btn} ${styles.btnReset}`} disabled={loading} onClick={() => void control('reset')}>
            RESET
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Órdenes creadas</div>
          <div className={`${styles.metricValue} ${styles.green}`}>{status?.orders_created ?? 0}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Pagadas</div>
          <div className={`${styles.metricValue} ${styles.green}`}>{status?.orders_paid ?? 0}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Canceladas</div>
          <div className={`${styles.metricValue} ${styles.orange}`}>{status?.orders_cancelled ?? 0}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>req/s</div>
          <div className={styles.metricValue}>{(status?.req_s ?? 0).toFixed(2)}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>p95 latencia</div>
          <div className={styles.metricValue}>{status?.p95_response_ms ?? 0}<span style={{ fontSize: '0.85rem', fontWeight: 400 }}>ms</span></div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Errores</div>
          <div className={`${styles.metricValue} ${(status?.errors ?? 0) > 0 ? styles.red : ''}`}>{status?.errors ?? 0}</div>
        </div>
      </div>

      {/* Bottom: venue bars + log */}
      <div className={styles.bottom}>

        <div className={styles.panel}>
          <div className={styles.panelTitle}>Carga por quiosco</div>
          {venueBars.length === 0 ? (
            <div className={styles.emptyVenues}>Sin datos aún</div>
          ) : (
            venueBars.map((v) => (
              <div key={v.name} className={styles.venueRow}>
                <span className={styles.venueName} title={v.name}>{v.name}</span>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${v.pct}%` }} />
                </div>
                <span className={styles.venueCount}>{v.count}</span>
              </div>
            ))
          )}
        </div>

        <div className={styles.panel}>
          <div className={styles.panelTitle}>Log de eventos</div>
          {!status?.log.length ? (
            <div className={styles.logEmpty}>Sin eventos</div>
          ) : (
            <div className={styles.log}>
              {status.log.map((e, i) => (
                <div key={i} className={styles.logEntry}>
                  <span className={styles.logTs}>{e.ts}</span>
                  <span className={`${styles.logMsg} ${styles[e.type]}`}>{e.msg}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
