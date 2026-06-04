'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CalendarRange, Check, Loader2, Plus, Power, PowerOff, Trash2, X,
} from 'lucide-react'
import styles from './eventos.module.css'

// ── Types ──────────────────────────────────────────────────────────────────────

type EventType = 'VENUE' | 'OUTDOOR'

interface EventRow {
  id:         number
  name:       string
  slug:       string
  type:       EventType
  date:       string | null
  is_active:  boolean
  created_at: string
  _count:     { venues: number; orders: number }
}

interface FormData {
  name: string
  type: EventType
  date: string
}

interface Toast { msg: string; ok: boolean }

// ── Helpers ────────────────────────────────────────────────────────────────────

function eventStatus(ev: EventRow): 'activo' | 'proximo' | 'cerrado' {
  if (ev.is_active) return 'activo'
  if (ev.date && new Date(ev.date) > new Date()) return 'proximo'
  return 'cerrado'
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
}

const EMPTY_FORM: FormData = { name: '', type: 'VENUE', date: '' }

// ── Component ──────────────────────────────────────────────────────────────────

export default function EventosPage() {
  const [events,   setEvents]   = useState<EventRow[]>([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const [form,     setForm]     = useState<FormData>(EMPTY_FORM)
  const [formErr,  setFormErr]  = useState<string | null>(null)
  const [saving,   setSaving]   = useState(false)
  const [acting,   setActing]   = useState<number | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [toast,    setToast]    = useState<Toast | null>(null)
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Data ───────────────────────────────────────────────────────────────────

  const fetchEvents = useCallback(async () => {
    try {
      const r = await fetch('/api/eventos')
      const d = await r.json() as { success: boolean; events?: EventRow[] }
      if (d.success && d.events) setEvents(d.events)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchEvents() }, [fetchEvents])

  // ── Toast ──────────────────────────────────────────────────────────────────

  const showToast = useCallback((msg: string, ok = true) => {
    if (toastRef.current) clearTimeout(toastRef.current)
    setToast({ msg, ok })
    toastRef.current = setTimeout(() => setToast(null), 3000)
  }, [])

  // ── Create ─────────────────────────────────────────────────────────────────

  async function handleCreate() {
    if (!form.name.trim()) { setFormErr('Nombre requerido'); return }
    setSaving(true); setFormErr(null)
    try {
      const r = await fetch('/api/eventos', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: form.name.trim(), type: form.type, date: form.date || undefined }),
      })
      const d = await r.json() as { success: boolean; event?: EventRow; error?: string }
      if (!d.success || !d.event) throw new Error(d.error ?? 'Error al crear')
      setEvents(prev => [d.event!, ...prev])
      setModal(false)
      setForm(EMPTY_FORM)
      showToast('Evento creado')
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : 'Error al crear')
    } finally {
      setSaving(false)
    }
  }

  // ── Activate / Deactivate ──────────────────────────────────────────────────

  async function handleToggle(ev: EventRow) {
    if (acting === ev.id) return
    setActing(ev.id)
    const action = ev.is_active ? 'deactivate' : 'activate'
    try {
      const r = await fetch(`/api/eventos/${ev.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action }),
      })
      const d = await r.json() as { success: boolean; event?: EventRow; error?: string }
      if (!d.success) throw new Error(d.error)
      // Si activé uno, desactivar todos los demás en UI
      if (action === 'activate') {
        setEvents(prev => prev.map(e => ({ ...e, is_active: e.id === ev.id })))
      } else {
        setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, is_active: false } : e))
      }
      showToast(action === 'activate' ? 'Evento activado' : 'Evento desactivado')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error', false)
    } finally {
      setActing(null)
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function handleDelete(ev: EventRow) {
    if (deleting === ev.id) return
    if (!confirm(`¿Eliminar "${ev.name}"?`)) return
    setDeleting(ev.id)
    try {
      const r = await fetch(`/api/eventos/${ev.id}`, { method: 'DELETE' })
      const d = await r.json() as { success: boolean; error?: string }
      if (!d.success) throw new Error(d.error)
      setEvents(prev => prev.filter(e => e.id !== ev.id))
      showToast(`"${ev.name}" eliminado`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error al eliminar', false)
    } finally {
      setDeleting(null)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>

      {/* Header */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Eventos</h1>
          <p className={styles.subtitle}>{events.length} evento{events.length !== 1 ? 's' : ''}</p>
        </div>
        <button className={styles.btnPrimary} onClick={() => { setForm(EMPTY_FORM); setFormErr(null); setModal(true) }}>
          <Plus size={16} aria-hidden />
          Nuevo Evento
        </button>
      </header>

      {/* Loading */}
      {loading && (
        <div className={styles.center}>
          <Loader2 size={26} className={styles.spin} aria-hidden />
          <span>Cargando…</span>
        </div>
      )}

      {/* Empty */}
      {!loading && events.length === 0 && (
        <div className={styles.center}>
          <CalendarRange size={44} strokeWidth={1.2} aria-hidden />
          <span>No hay eventos</span>
          <button className={styles.btnPrimary} onClick={() => { setForm(EMPTY_FORM); setFormErr(null); setModal(true) }}>
            <Plus size={15} aria-hidden /> Crear primer evento
          </button>
        </div>
      )}

      {/* Event cards */}
      {!loading && events.length > 0 && (
        <div className={styles.list}>
          {events.map(ev => {
            const status = eventStatus(ev)
            return (
              <div key={ev.id} className={`${styles.card} ${ev.is_active ? styles.cardActive : ''}`}>

                <div className={styles.cardMain}>
                  <div className={styles.cardTop}>
                    <span className={styles.cardName}>{ev.name}</span>
                    <span className={`${styles.typeBadge} ${styles[`type_${ev.type}`]}`}>
                      {ev.type}
                    </span>
                  </div>

                  <div className={styles.cardMeta}>
                    <span className={`${styles.statusBadge} ${styles[`status_${status}`]}`}>
                      {status === 'activo' && <span className={styles.pulseDot} />}
                      {status === 'activo' ? 'ACTIVO' : status === 'proximo' ? 'PRÓXIMO' : 'CERRADO'}
                    </span>
                    <span className={styles.metaItem}>
                      <CalendarRange size={11} aria-hidden />
                      {fmtDate(ev.date)}
                    </span>
                    <span className={styles.metaItem}>
                      {ev._count.venues} quiosco{ev._count.venues !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className={styles.cardActions}>
                  <button
                    className={`${styles.iconBtn} ${ev.is_active ? styles.iconBtnOff : styles.iconBtnOn}`}
                    onClick={() => handleToggle(ev)}
                    disabled={acting === ev.id}
                    aria-label={ev.is_active ? 'Desactivar' : 'Activar'}
                    title={ev.is_active ? 'Desactivar' : 'Activar'}
                  >
                    {acting === ev.id
                      ? <Loader2 size={15} className={styles.spin} aria-hidden />
                      : ev.is_active
                        ? <PowerOff size={15} aria-hidden />
                        : <Power size={15} aria-hidden />
                    }
                  </button>

                  {ev._count.orders === 0 && (
                    <button
                      className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                      onClick={() => handleDelete(ev)}
                      disabled={deleting === ev.id}
                      aria-label={`Eliminar ${ev.name}`}
                    >
                      {deleting === ev.id
                        ? <Loader2 size={15} className={styles.spin} aria-hidden />
                        : <Trash2 size={15} aria-hidden />
                      }
                    </button>
                  )}
                </div>

              </div>
            )
          })}
        </div>
      )}

      {/* Modal — crear evento */}
      {modal && (
        <div className={styles.overlay} onClick={() => setModal(false)} role="dialog" aria-modal aria-label="Nuevo evento">
          <div className={styles.modalBox} onClick={e => e.stopPropagation()}>

            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>Nuevo Evento</span>
              <button className={styles.closeBtn} onClick={() => setModal(false)} aria-label="Cerrar">
                <X size={18} aria-hidden />
              </button>
            </div>

            <div className={styles.modalBody}>

              <label className={styles.fieldLabel}>
                Nombre del evento *
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Ej: Clásico Guaiqueries 2026"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  maxLength={120}
                  autoFocus
                />
              </label>

              <label className={styles.fieldLabel}>
                Tipo
                <div className={styles.typeOptions}>
                  {(['VENUE', 'OUTDOOR'] as EventType[]).map(t => (
                    <button
                      key={t}
                      type="button"
                      className={`${styles.typeOpt} ${form.type === t ? styles.typeOptActive : ''} ${form.type === t ? styles[`typeOptActive_${t}`] : ''}`}
                      onClick={() => setForm(p => ({ ...p, type: t }))}
                    >
                      {t === 'VENUE' ? 'En Quiosco' : 'Al Aire Libre'}
                    </button>
                  ))}
                </div>
              </label>

              <label className={styles.fieldLabel}>
                Fecha
                <input
                  type="date"
                  className={styles.input}
                  value={form.date}
                  onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                />
              </label>

              {formErr && <p className={styles.formError} role="alert">{formErr}</p>}

            </div>

            <div className={styles.modalFooter}>
              <button className={styles.btnSecondary} onClick={() => setModal(false)} disabled={saving}>
                Cancelar
              </button>
              <button className={styles.btnPrimary} onClick={handleCreate} disabled={saving}>
                {saving ? <Loader2 size={15} className={styles.spin} aria-hidden /> : <Check size={15} aria-hidden />}
                {saving ? 'Creando…' : 'Crear Evento'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`${styles.toast} ${toast.ok ? styles.toastOk : styles.toastErr}`} role="status">
          {toast.ok ? <Check size={14} aria-hidden /> : <X size={14} aria-hidden />}
          {toast.msg}
        </div>
      )}

    </div>
  )
}
