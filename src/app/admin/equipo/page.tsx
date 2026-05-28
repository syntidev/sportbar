'use client'

import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import {
  AlertCircle, Eye, EyeOff, KeyRound, MessageCircle, UserPlus, X,
  ChefHat, Wine, Truck, ShieldCheck, Users,
} from 'lucide-react'
import type { Role } from '@/types'
import styles from './page.module.css'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TeamUser {
  id:         number
  code:       string
  name:       string
  lastname:   string
  role:       Role
  is_active:  boolean
  created_at: string
}

interface Venue {
  id:       number
  name:     string
  type:     string
  is_active: boolean
}

interface NewUserForm {
  name:      string
  lastname:  string
  role:      Exclude<Role, 'admin'>
  pin:       string
  cedula:    string
  telefono:  string
  venue_id:  number | null
}

// ── Role metadata ─────────────────────────────────────────────────────────────

const ROLE_ORDER: Exclude<Role, 'admin'>[] = ['mesero', 'cocina', 'bar', 'despacho', 'validador']

const ROLE_META: Record<Exclude<Role, 'admin'>, { label: string; color: string; icon: typeof Users }> = {
  mesero:    { label: 'Mesero',    color: 'var(--color-primary)',  icon: Users       },
  cocina:    { label: 'Cocina',    color: 'var(--color-accent)',   icon: ChefHat     },
  bar:       { label: 'Bar',       color: 'var(--color-brand)',    icon: Wine        },
  despacho:  { label: 'Despacho',  color: 'var(--color-listo)',    icon: Truck       },
  validador: { label: 'Validador', color: 'var(--color-credito)',  icon: ShieldCheck },
}

const FORM_INIT: NewUserForm = { name: '', lastname: '', role: 'mesero', pin: '', cedula: '', telefono: '', venue_id: null }

// ── Component ─────────────────────────────────────────────────────────────────

export default function EquipoPage() {
  const [users,     setUsers]     = useState<TeamUser[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [toggling,  setToggling]  = useState<number | null>(null)

  // new user modal
  const [showNew,   setShowNew]   = useState(false)
  const [form,      setForm]      = useReducer(
    (s: NewUserForm, p: Partial<NewUserForm>) => ({ ...s, ...p }),
    FORM_INIT,
  )
  const [saving,    setSaving]    = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // venues for selector
  const [venues,      setVenues]      = useState<Venue[]>([])
  const [venuesReady, setVenuesReady] = useState(false)

  // change PIN modal
  const [pinTarget,  setPinTarget]  = useState<TeamUser | null>(null)
  const [newPin,     setNewPin]     = useState('')
  const [pinSaving,  setPinSaving]  = useState(false)
  const [pinError,   setPinError]   = useState<string | null>(null)

  const firstInputRef = useRef<HTMLInputElement>(null)

  // ── Load ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch('/api/users')
      .then((r) => r.json())
      .then((d) => { if (!d.success) throw new Error(d.error); setUsers(d.users) })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Error al cargar equipo'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!showNew) return
    setTimeout(() => firstInputRef.current?.focus(), 50)
    if (venuesReady) return
    fetch('/api/venues')
      .then((r) => r.json())
      .then((d: { venues?: Venue[] }) => { if (d.venues) setVenues(d.venues.filter((v) => v.is_active)) })
      .catch(() => { /* non-blocking */ })
      .finally(() => setVenuesReady(true))
  }, [showNew, venuesReady])

  // ── Toggle active ────────────────────────────────────────────────────────────

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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al actualizar')
    } finally {
      setToggling(null)
    }
  }, [])

  // ── Save new user ────────────────────────────────────────────────────────────

  const handleSaveNew = async () => {
    if (!form.name.trim() || !form.lastname.trim()) { setFormError('Nombre y apellido son requeridos'); return }
    if (!/^\d{4}$/.test(form.pin)) { setFormError('PIN debe ser exactamente 4 dígitos'); return }
    setSaving(true); setFormError(null)
    try {
      const res  = await fetch('/api/users', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:      form.name,
          lastname:  form.lastname,
          role:      form.role,
          pin:       form.pin,
          cedula:    form.cedula   || undefined,
          telefono:  form.telefono || undefined,
          venue_id:  form.venue_id ?? undefined,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error((data.errors ?? [data.error]).join(', '))
      setUsers((prev) => [...prev, data.user])
      setShowNew(false)
      setForm(FORM_INIT)
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Error al crear usuario')
    } finally {
      setSaving(false)
    }
  }

  // ── Change PIN ───────────────────────────────────────────────────────────────

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
      setPinTarget(null); setNewPin('')
    } catch (e: unknown) {
      setPinError(e instanceof Error ? e.message : 'Error al cambiar PIN')
    } finally {
      setPinSaving(false)
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const grouped = ROLE_ORDER.reduce<Record<string, TeamUser[]>>((acc, role) => {
    acc[role] = users.filter((u) => u.role === role)
    return acc
  }, {})

  const initials = (u: TeamUser) =>
    `${u.name[0] ?? ''}${u.lastname[0] ?? ''}`.toUpperCase()

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Equipo</h1>
          <p className={styles.subtitle}>Usuarios activos · Roles · PINs</p>
        </div>
        <button
          type="button"
          className={styles.btnNew}
          onClick={() => { setShowNew(true); setFormError(null); setForm(FORM_INIT) }}
        >
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
                              onClick={() => handleToggle(u)}
                              disabled={toggling === u.id}
                              aria-label={u.is_active ? 'Desactivar usuario' : 'Activar usuario'}
                              aria-pressed={u.is_active}
                              className={`${styles.actionBtn} ${u.is_active ? styles.toggleOn : styles.toggleOff}`}
                            >
                              {u.is_active
                                ? <Eye size={13} aria-hidden />
                                : <EyeOff size={13} aria-hidden />}
                            </button>
                            <button
                              type="button"
                              onClick={() => { setPinTarget(u); setNewPin(''); setPinError(null) }}
                              aria-label={`Cambiar PIN de ${u.name}`}
                              className={`${styles.actionBtn} ${styles.pinBtn}`}
                            >
                              <KeyRound size={13} aria-hidden />
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

      {/* ── Modal: Nuevo usuario ─────────────────────────────────────────── */}
      {showNew && (
        <div className={styles.overlay} onClick={() => setShowNew(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal aria-label="Nuevo usuario">
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>Nuevo usuario</span>
              <button type="button" className={styles.modalClose} onClick={() => setShowNew(false)} aria-label="Cerrar">
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

              <div className={styles.fieldRow}>
                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Cédula</span>
                  <input
                    className={styles.input}
                    value={form.cedula}
                    onChange={(e) => setForm({ cedula: e.target.value.replace(/\D/g, '').slice(0, 9) })}
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
                      onChange={(e) => setForm({ telefono: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                      inputMode="numeric"
                      placeholder="04121234567"
                      maxLength={11}
                    />
                    <a
                      href={form.telefono.length >= 10 ? `https://wa.me/58${form.telefono.replace(/^0/, '')}` : undefined}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Abrir WhatsApp"
                      className={`${styles.inputIconBtn} ${form.telefono.length >= 10 ? styles.inputIconActive : styles.inputIconDisabled}`}
                      onClick={(e) => { if (form.telefono.length < 10) e.preventDefault() }}
                      tabIndex={form.telefono.length >= 10 ? 0 : -1}
                    >
                      <MessageCircle size={14} strokeWidth={2} aria-hidden />
                    </a>
                  </div>
                </div>
              </div>

              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Rol</span>
                <select
                  className={styles.input}
                  value={form.role}
                  onChange={(e) => setForm({ role: e.target.value as Exclude<Role, 'admin'> })}
                >
                  {ROLE_ORDER.map((r) => (
                    <option key={r} value={r}>{ROLE_META[r].label}</option>
                  ))}
                </select>
              </label>

              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Punto de venta</span>
                <select
                  className={styles.input}
                  value={form.venue_id ?? ''}
                  onChange={(e) => setForm({ venue_id: e.target.value ? Number(e.target.value) : null })}
                >
                  <option value="">— Sin asignar —</option>
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </label>

              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>PIN (4 dígitos)</span>
                <input
                  className={styles.input}
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={form.pin}
                  onChange={(e) => setForm({ pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  placeholder="••••"
                />
              </label>

              {formError && (
                <p className={styles.modalError}>
                  <AlertCircle size={13} aria-hidden /> {formError}
                </p>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnCancel} onClick={() => setShowNew(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className={styles.btnSave}
                onClick={handleSaveNew}
                disabled={saving}
              >
                {saving ? 'Guardando…' : 'Crear usuario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Cambiar PIN ───────────────────────────────────────────── */}
      {pinTarget && (
        <div className={styles.overlay} onClick={() => setPinTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal aria-label="Cambiar PIN">
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>Cambiar PIN</span>
              <button type="button" className={styles.modalClose} onClick={() => setPinTarget(null)} aria-label="Cerrar">
                <X size={16} aria-hidden />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.pinTargetName}>
                {pinTarget.name} {pinTarget.lastname}
                <span className={styles.pinTargetCode}> · {pinTarget.code}</span>
              </p>

              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Nuevo PIN (4 dígitos)</span>
                <input
                  className={styles.input}
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  autoFocus
                />
              </label>

              {pinError && (
                <p className={styles.modalError}>
                  <AlertCircle size={13} aria-hidden /> {pinError}
                </p>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnCancel} onClick={() => setPinTarget(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className={styles.btnSave}
                onClick={handleSavePin}
                disabled={pinSaving || newPin.length !== 4}
              >
                {pinSaving ? 'Guardando…' : 'Guardar PIN'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
