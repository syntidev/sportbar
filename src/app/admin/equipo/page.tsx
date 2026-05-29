'use client'

import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle, CheckCircle, ChefHat, Eye, EyeOff, KeyRound, Loader2,
  MessageCircle, Pencil, RefreshCw, ShieldCheck, Trash2, Truck,
  UserPlus, Users, Wine, X,
} from 'lucide-react'
import type { Role } from '@/types'
import styles from './page.module.css'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TeamUser {
  id:           number
  code:         string
  name:         string
  lastname:     string
  role:         Role
  is_active:    boolean
  created_at:   string
  access_start: string | null
  access_end:   string | null
  access_days:  string[] | null
}

interface Venue {
  id:        number
  name:      string
  type:      string
  is_active: boolean
}

interface UserForm {
  name:         string
  lastname:     string
  role:         Exclude<Role, 'admin'>
  pin:          string
  cedula:       string
  telefono:     string
  venue_id:     number | null
  access_start: string
  access_end:   string
  access_days:  string[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLE_ORDER: Exclude<Role, 'admin'>[] = ['mesero', 'cocina', 'bar', 'despacho', 'validador']

const ROLE_META: Record<Exclude<Role, 'admin'>, { label: string; color: string; icon: typeof Users }> = {
  mesero:    { label: 'Mesero',    color: 'var(--color-primary)',  icon: Users       },
  cocina:    { label: 'Cocina',    color: 'var(--color-accent)',   icon: ChefHat     },
  bar:       { label: 'Bar',       color: 'var(--color-brand)',    icon: Wine        },
  despacho:  { label: 'Despacho',  color: 'var(--color-listo)',    icon: Truck       },
  validador: { label: 'Validador', color: 'var(--color-credito)',  icon: ShieldCheck },
}

const DAYS = [
  { key: 'mon', label: 'L', full: 'Lunes'     },
  { key: 'tue', label: 'M', full: 'Martes'    },
  { key: 'wed', label: 'X', full: 'Miércoles' },
  { key: 'thu', label: 'J', full: 'Jueves'    },
  { key: 'fri', label: 'V', full: 'Viernes'   },
  { key: 'sat', label: 'S', full: 'Sábado'    },
  { key: 'sun', label: 'D', full: 'Domingo'   },
] as const

const FORM_INIT: UserForm = {
  name: '', lastname: '', role: 'mesero', pin: '',
  cedula: '', telefono: '', venue_id: null,
  access_start: '', access_end: '', access_days: [],
}

// ── Anim presets ──────────────────────────────────────────────────────────────

const OVERLAY_ANIM = {
  initial:    { opacity: 0 },
  animate:    { opacity: 1 },
  exit:       { opacity: 0 },
  transition: { duration: 0.18 },
}

const SHEET_ANIM = {
  initial:    { y: '100%' },
  animate:    { y: 0 },
  exit:       { y: '100%' },
  transition: { type: 'spring' as const, damping: 30, stiffness: 380 },
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EquipoPage() {
  const [users,    setUsers]    = useState<TeamUser[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [toggling, setToggling] = useState<number | null>(null)

  // modal create / edit
  const [showModal,  setShowModal]  = useState(false)
  const [editTarget, setEditTarget] = useState<TeamUser | null>(null)
  const [form, setForm] = useReducer(
    (s: UserForm, p: Partial<UserForm>) => ({ ...s, ...p }),
    FORM_INIT,
  )
  const [saving,    setSaving]    = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // venues
  const [venues,      setVenues]      = useState<Venue[]>([])
  const [venuesReady, setVenuesReady] = useState(false)

  // PIN modal
  const [pinTarget, setPinTarget] = useState<TeamUser | null>(null)
  const [newPin,    setNewPin]    = useState('')
  const [pinSaving, setPinSaving] = useState(false)
  const [pinError,  setPinError]  = useState<string | null>(null)

  // delete modal
  const [deleteTarget, setDeleteTarget] = useState<TeamUser | null>(null)
  const [deleting,     setDeleting]     = useState(false)
  const [deleteError,  setDeleteError]  = useState<string | null>(null)

  // toast
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const firstInputRef = useRef<HTMLInputElement>(null)

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }, [])

  function generatePin(): string {
    return String(Math.floor(1000 + Math.random() * 9000))
  }

  function daysLabel(days: string[] | null) {
    if (!days?.length) return 'Todos los días'
    return days.map((d) => DAYS.find((x) => x.key === d)?.label ?? d).join(' ')
  }

  function toggleDay(key: string) {
    setForm({
      access_days: form.access_days.includes(key)
        ? form.access_days.filter((d) => d !== key)
        : [...form.access_days, key],
    })
  }

  const grouped = ROLE_ORDER.reduce<Record<string, TeamUser[]>>((acc, role) => {
    acc[role] = users.filter((u) => u.role === role)
    return acc
  }, {})

  const initials = (u: TeamUser) => `${u.name[0] ?? ''}${u.lastname[0] ?? ''}`.toUpperCase()

  // ── Load ─────────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch('/api/users')
      .then((r) => r.json())
      .then((d) => { if (!d.success) throw new Error(d.error); setUsers(d.users) })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Error al cargar equipo'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!showModal) return
    setTimeout(() => firstInputRef.current?.focus(), 50)
    if (venuesReady) return
    fetch('/api/venues')
      .then((r) => r.json())
      .then((d: { venues?: Venue[] }) => {
        if (d.venues) setVenues(d.venues.filter((v) => v.is_active))
      })
      .catch(() => { /* non-blocking */ })
      .finally(() => setVenuesReady(true))
  }, [showModal, venuesReady])

  // ── Modal helpers ─────────────────────────────────────────────────────────────

  function openCreate() {
    setEditTarget(null)
    setForm(FORM_INIT)
    setFormError(null)
    setShowModal(true)
  }

  function openEdit(u: TeamUser) {
    setEditTarget(u)
    setForm({
      name:         u.name,
      lastname:     u.lastname,
      role:         u.role as Exclude<Role, 'admin'>,
      pin:          '',
      cedula:       '',
      telefono:     '',
      venue_id:     null,
      access_start: u.access_start ?? '',
      access_end:   u.access_end   ?? '',
      access_days:  u.access_days  ?? [],
    })
    setFormError(null)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditTarget(null)
  }

  // ── Toggle active ─────────────────────────────────────────────────────────────

  const handleToggle = useCallback(async (u: TeamUser) => {
    setToggling(u.id)
    try {
      const res  = await fetch(`/api/users/${u.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ op: 'toggle', is_active: !u.is_active }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, is_active: !u.is_active } : x))
      showToast(u.is_active ? `${u.name} desactivado` : `${u.name} activado`)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error al actualizar', false)
    } finally {
      setToggling(null)
    }
  }, [showToast])

  // ── Save (create / edit) ──────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.name.trim() || !form.lastname.trim()) {
      setFormError('Nombre y apellido son requeridos'); return
    }
    if (!editTarget && !/^\d{4}$/.test(form.pin)) {
      setFormError('PIN debe ser exactamente 4 dígitos'); return
    }
    if (editTarget && form.pin && !/^\d{4}$/.test(form.pin)) {
      setFormError('PIN debe ser exactamente 4 dígitos'); return
    }

    setSaving(true); setFormError(null)
    const isEdit = !!editTarget
    try {
      if (editTarget) {
        const body: Record<string, unknown> = {
          op:           'update',
          name:         form.name,
          lastname:     form.lastname,
          role:         form.role,
          access_start: form.access_start || null,
          access_end:   form.access_end   || null,
          access_days:  form.access_days.length ? form.access_days : null,
        }
        if (form.pin) body.pin = form.pin
        const res  = await fetch(`/api/users/${editTarget.id}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(body),
        })
        const data = await res.json()
        if (!data.success) throw new Error((data.errors ?? [data.error]).join(', '))
        setUsers((prev) => prev.map((x) =>
          x.id === editTarget.id
            ? {
                ...x,
                name:         form.name,
                lastname:     form.lastname,
                role:         form.role,
                access_start: form.access_start || null,
                access_end:   form.access_end   || null,
                access_days:  form.access_days.length ? form.access_days : null,
              }
            : x
        ))
      } else {
        const res  = await fetch('/api/users', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            name:         form.name,
            lastname:     form.lastname,
            role:         form.role,
            pin:          form.pin,
            cedula:       form.cedula   || undefined,
            telefono:     form.telefono || undefined,
            venue_id:     form.venue_id ?? undefined,
            access_start: form.access_start || undefined,
            access_end:   form.access_end   || undefined,
            access_days:  form.access_days.length ? form.access_days : undefined,
          }),
        })
        const data = await res.json()
        if (!data.success) throw new Error((data.errors ?? [data.error]).join(', '))
        setUsers((prev) => [...prev, data.user])
      }
      closeModal()
      showToast(isEdit ? 'Usuario actualizado' : 'Usuario creado')
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  // ── Change PIN ────────────────────────────────────────────────────────────────

  const handleSavePin = async () => {
    if (!pinTarget) return
    if (!/^\d{4}$/.test(newPin)) { setPinError('PIN debe ser exactamente 4 dígitos'); return }
    setPinSaving(true); setPinError(null)
    try {
      const res  = await fetch(`/api/users/${pinTarget.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ op: 'pin', pin: newPin }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      const name = pinTarget.name
      setPinTarget(null); setNewPin('')
      showToast(`PIN cambiado: ${name}`)
    } catch (e: unknown) {
      setPinError(e instanceof Error ? e.message : 'Error al cambiar PIN')
    } finally {
      setPinSaving(false)
    }
  }

  // ── Delete user ───────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true); setDeleteError(null)
    try {
      const res  = await fetch(`/api/users/${deleteTarget.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      const fullName = `${deleteTarget.name} ${deleteTarget.lastname}`
      setUsers((prev) => prev.filter((x) => x.id !== deleteTarget.id))
      setDeleteTarget(null)
      showToast(`${fullName} eliminado`)
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : 'Error al eliminar')
    } finally {
      setDeleting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Equipo</h1>
          <p className={styles.subtitle}>Usuarios · Roles · Horario de acceso</p>
        </div>
        <button type="button" className={styles.btnNew} onClick={openCreate}>
          <UserPlus size={15} strokeWidth={2.2} aria-hidden />
          Nuevo usuario
        </button>
      </header>

      {loading && (
        <div className={styles.state}>
          <span className={styles.spinner} />
          <span className={styles.stateText}>Cargando equipo…</span>
        </div>
      )}

      {error && (
        <div className={`${styles.state} ${styles.stateError}`}>
          <AlertCircle size={18} aria-hidden />
          <span className={styles.stateText}>{error}</span>
        </div>
      )}

      {!loading && !error && (
        <div className={styles.sections}>
          {ROLE_ORDER.map((role) => {
            const meta  = ROLE_META[role]
            const items = grouped[role] ?? []
            const Icon  = meta.icon
            return (
              <section key={role} className={styles.section}>
                <div className={styles.sectionHeader}>
                  <span
                    className={styles.sectionIcon}
                    style={{ '--role-color': meta.color } as React.CSSProperties}
                  >
                    <Icon size={13} strokeWidth={2} aria-hidden />
                  </span>
                  <h2 className={styles.sectionTitle}>{meta.label}</h2>
                  <span className={styles.sectionCount}>{items.length}</span>
                </div>

                {items.length === 0 ? (
                  <p className={styles.empty}>Sin usuarios en este rol</p>
                ) : (
                  <div className={styles.grid}>
                    {items.map((u) => (
                      <article
                        key={u.id}
                        className={`${styles.card} ${!u.is_active ? styles.cardInactive : ''}`}
                        style={{ '--role-color': meta.color } as React.CSSProperties}
                      >
                        <div className={styles.cardMain}>
                          <div className={styles.avatar}>{initials(u)}</div>
                          <div className={styles.cardInfo}>
                            <span className={styles.cardName}>{u.name} {u.lastname}</span>
                            <span className={styles.cardCode}>{u.code}</span>
                          </div>
                        </div>

                        {(u.access_days?.length || u.access_start) && (
                          <div className={styles.accessInfo}>
                            {u.access_days?.length
                              ? <span className={styles.accessDays}>{daysLabel(u.access_days)}</span>
                              : null}
                            {u.access_start && u.access_end && (
                              <span className={styles.accessTime}>
                                {u.access_start.slice(0, 5)} – {u.access_end.slice(0, 5)}
                              </span>
                            )}
                          </div>
                        )}

                        <div className={styles.cardFooter}>
                          <span
                            className={styles.roleBadge}
                            style={{ '--role-color': meta.color } as React.CSSProperties}
                          >
                            {meta.label}
                          </span>
                          <div className={styles.cardActions}>
                            <button
                              type="button"
                              onClick={() => openEdit(u)}
                              aria-label={`Editar ${u.name}`}
                              className={`${styles.actionBtn} ${styles.editBtn}`}
                            >
                              <Pencil size={12} aria-hidden />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggle(u)}
                              disabled={toggling === u.id}
                              aria-label={u.is_active ? 'Desactivar usuario' : 'Activar usuario'}
                              aria-pressed={u.is_active}
                              className={`${styles.actionBtn} ${u.is_active ? styles.toggleOn : styles.toggleOff}`}
                            >
                              {toggling === u.id
                                ? <Loader2 size={12} className={styles.spin} aria-hidden />
                                : u.is_active
                                  ? <Eye size={13} aria-hidden />
                                  : <EyeOff size={13} aria-hidden />
                              }
                            </button>
                            <button
                              type="button"
                              onClick={() => { setPinTarget(u); setNewPin(''); setPinError(null) }}
                              aria-label={`Cambiar PIN de ${u.name}`}
                              className={`${styles.actionBtn} ${styles.pinBtn}`}
                            >
                              <KeyRound size={13} aria-hidden />
                            </button>
                            <button
                              type="button"
                              onClick={() => { setDeleteTarget(u); setDeleteError(null) }}
                              aria-label={`Eliminar ${u.name}`}
                              className={`${styles.actionBtn} ${styles.deleteBtn}`}
                            >
                              <Trash2 size={12} aria-hidden />
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}

      {/* ── Modal: crear / editar ── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className={styles.overlay}
            {...OVERLAY_ANIM}
            onClick={closeModal}
          >
            <motion.div
              className={styles.modal}
              {...SHEET_ANIM}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal
              aria-label={editTarget ? 'Editar usuario' : 'Nuevo usuario'}
            >
              <div className={styles.modalHeader}>
                <span className={styles.modalTitle}>
                  {editTarget ? 'Editar usuario' : 'Nuevo usuario'}
                </span>
                <button
                  type="button"
                  className={styles.modalClose}
                  onClick={closeModal}
                  aria-label="Cerrar"
                >
                  <X size={16} aria-hidden />
                </button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.fieldRow}>
                  <label className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>Nombre</span>
                    <input
                      ref={firstInputRef}
                      className={styles.input}
                      value={form.name}
                      onChange={(e) => setForm({ name: e.target.value })}
                      placeholder="Juan"
                      maxLength={100}
                    />
                  </label>
                  <label className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>Apellido</span>
                    <input
                      className={styles.input}
                      value={form.lastname}
                      onChange={(e) => setForm({ lastname: e.target.value })}
                      placeholder="García"
                      maxLength={100}
                    />
                  </label>
                </div>

                {!editTarget && (
                  <div className={styles.fieldRow}>
                    <label className={styles.fieldGroup}>
                      <span className={styles.fieldLabel}>Cédula</span>
                      <input
                        className={styles.input}
                        value={form.cedula}
                        onChange={(e) =>
                          setForm({ cedula: e.target.value.replace(/\D/g, '').slice(0, 9) })
                        }
                        inputMode="numeric"
                        placeholder="12345678"
                        maxLength={9}
                      />
                    </label>
                    <div className={styles.fieldGroup} style={{ flex: 1 }}>
                      <span className={styles.fieldLabel}>Teléfono / WhatsApp</span>
                      <div className={styles.inputWrap}>
                        <input
                          className={`${styles.input} ${styles.inputWithIcon}`}
                          value={form.telefono}
                          onChange={(e) =>
                            setForm({ telefono: e.target.value.replace(/\D/g, '').slice(0, 11) })
                          }
                          inputMode="numeric"
                          placeholder="04121234567"
                          maxLength={11}
                        />
                        <a
                          href={
                            form.telefono.length >= 10
                              ? `https://wa.me/58${form.telefono.replace(/^0/, '')}`
                              : undefined
                          }
                          target="_blank"
                          rel="noreferrer"
                          aria-label="Abrir WhatsApp"
                          className={`${styles.inputIconBtn} ${
                            form.telefono.length >= 10
                              ? styles.inputIconActive
                              : styles.inputIconDisabled
                          }`}
                          onClick={(e) => { if (form.telefono.length < 10) e.preventDefault() }}
                          tabIndex={form.telefono.length >= 10 ? 0 : -1}
                        >
                          <MessageCircle size={14} strokeWidth={2} aria-hidden />
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                <div className={styles.fieldRow}>
                  <label className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>Rol</span>
                    <select
                      className={styles.input}
                      value={form.role}
                      onChange={(e) =>
                        setForm({ role: e.target.value as Exclude<Role, 'admin'> })
                      }
                    >
                      {ROLE_ORDER.map((r) => (
                        <option key={r} value={r}>{ROLE_META[r].label}</option>
                      ))}
                    </select>
                  </label>
                  {!editTarget && (
                    <label className={styles.fieldGroup}>
                      <span className={styles.fieldLabel}>Punto de venta</span>
                      <select
                        className={styles.input}
                        value={form.venue_id ?? ''}
                        onChange={(e) =>
                          setForm({ venue_id: e.target.value ? Number(e.target.value) : null })
                        }
                      >
                        <option value="">— Sin asignar —</option>
                        {venues.map((v) => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>

                {/* PIN con auto-generar */}
                <div className={styles.fieldGroup}>
                  <div className={styles.fieldLabelRow}>
                    <span className={styles.fieldLabel}>
                      {editTarget ? 'Nuevo PIN (vacío = sin cambio)' : 'PIN (4 dígitos)'}
                    </span>
                    <button
                      type="button"
                      className={styles.pinGenBtn}
                      onClick={() => setForm({ pin: generatePin() })}
                    >
                      <RefreshCw size={10} aria-hidden />
                      Generar
                    </button>
                  </div>
                  <input
                    className={styles.input}
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={form.pin}
                    onChange={(e) =>
                      setForm({ pin: e.target.value.replace(/\D/g, '').slice(0, 4) })
                    }
                    placeholder="••••"
                  />
                </div>

                {/* Días */}
                <div className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>
                    Días habilitados{' '}
                    <span className={styles.fieldOptional}>(vacío = todos)</span>
                  </span>
                  <div className={styles.dayPicker}>
                    {DAYS.map((d) => (
                      <button
                        key={d.key}
                        type="button"
                        className={`${styles.dayBtn} ${
                          form.access_days.includes(d.key) ? styles.dayBtnOn : ''
                        }`}
                        title={d.full}
                        onClick={() => toggleDay(d.key)}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Horario */}
                <div className={styles.fieldRow}>
                  <label className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>Acceso desde</span>
                    <input
                      className={styles.input}
                      type="time"
                      value={form.access_start}
                      onChange={(e) => setForm({ access_start: e.target.value })}
                    />
                  </label>
                  <label className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>Acceso hasta</span>
                    <input
                      className={styles.input}
                      type="time"
                      value={form.access_end}
                      onChange={(e) => setForm({ access_end: e.target.value })}
                    />
                  </label>
                </div>
                <p className={styles.fieldHint}>
                  El sistema cerrará la sesión fuera del horario configurado.
                </p>

                {formError && (
                  <p className={styles.modalError}>
                    <AlertCircle size={13} aria-hidden /> {formError}
                  </p>
                )}
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnCancel} onClick={closeModal}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className={styles.btnSave}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <><Loader2 size={14} className={styles.spin} aria-hidden /> Guardando…</>
                  ) : editTarget ? 'Guardar cambios' : 'Crear usuario'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal: cambiar PIN ── */}
      <AnimatePresence>
        {pinTarget && (
          <motion.div
            className={styles.overlay}
            {...OVERLAY_ANIM}
            onClick={() => setPinTarget(null)}
          >
            <motion.div
              className={styles.modal}
              {...SHEET_ANIM}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal
              aria-label="Cambiar PIN"
            >
              <div className={styles.modalHeader}>
                <span className={styles.modalTitle}>Cambiar PIN</span>
                <button
                  type="button"
                  className={styles.modalClose}
                  onClick={() => setPinTarget(null)}
                  aria-label="Cerrar"
                >
                  <X size={16} aria-hidden />
                </button>
              </div>

              <div className={styles.modalBody}>
                <p className={styles.pinTargetName}>
                  {pinTarget.name} {pinTarget.lastname}
                  <span className={styles.pinTargetCode}> · {pinTarget.code}</span>
                </p>
                <div className={styles.fieldGroup}>
                  <div className={styles.fieldLabelRow}>
                    <span className={styles.fieldLabel}>Nuevo PIN (4 dígitos)</span>
                    <button
                      type="button"
                      className={styles.pinGenBtn}
                      onClick={() => setNewPin(generatePin())}
                    >
                      <RefreshCw size={10} aria-hidden />
                      Generar
                    </button>
                  </div>
                  <input
                    className={styles.input}
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={newPin}
                    onChange={(e) =>
                      setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))
                    }
                    placeholder="••••"
                    autoFocus
                  />
                </div>
                {pinError && (
                  <p className={styles.modalError}>
                    <AlertCircle size={13} aria-hidden /> {pinError}
                  </p>
                )}
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnCancel}
                  onClick={() => setPinTarget(null)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className={styles.btnSave}
                  onClick={handleSavePin}
                  disabled={pinSaving || newPin.length !== 4}
                >
                  {pinSaving ? (
                    <><Loader2 size={14} className={styles.spin} aria-hidden /> Guardando…</>
                  ) : 'Guardar PIN'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal: confirmar eliminación ── */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            className={styles.overlay}
            {...OVERLAY_ANIM}
            onClick={() => { if (!deleting) setDeleteTarget(null) }}
          >
            <motion.div
              className={styles.modal}
              {...SHEET_ANIM}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal
              aria-label="Confirmar eliminación"
            >
              <div className={styles.modalHeader}>
                <span className={styles.modalTitle}>Eliminar usuario</span>
                <button
                  type="button"
                  className={styles.modalClose}
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  aria-label="Cerrar"
                >
                  <X size={16} aria-hidden />
                </button>
              </div>

              <div className={styles.modalBody}>
                <p className={styles.confirmText}>
                  ¿Eliminar a{' '}
                  <strong>{deleteTarget.name} {deleteTarget.lastname}</strong>
                  {' '}(<span className={styles.confirmCode}>{deleteTarget.code}</span>)?
                </p>
                <p className={styles.fieldHint}>
                  Acción irreversible. Si el usuario tiene órdenes registradas, la operación será bloqueada.
                </p>
                {deleteError && (
                  <p className={styles.modalError}>
                    <AlertCircle size={13} aria-hidden /> {deleteError}
                  </p>
                )}
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnCancel}
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className={styles.btnDanger}
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <><Loader2 size={14} className={styles.spin} aria-hidden /> Eliminando…</>
                  ) : (
                    <><Trash2 size={14} aria-hidden /> Eliminar</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className={`${styles.toast} ${toast.ok ? styles.toastOk : styles.toastErr}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            transition={{ type: 'spring', damping: 26, stiffness: 340 }}
            role="status"
            aria-live="polite"
          >
            {toast.ok
              ? <CheckCircle size={14} aria-hidden />
              : <AlertCircle size={14} aria-hidden />
            }
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
