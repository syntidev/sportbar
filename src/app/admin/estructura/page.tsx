'use client'

import { useEffect, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import * as Dialog from '@radix-ui/react-dialog'
import {
  AlertCircle, Eye, EyeOff, Pencil, Plus, Users, X,
  Store, ChefHat, ShoppingBag,
} from 'lucide-react'
import styles from './page.module.css'

// ── Types ─────────────────────────────────────────────────────────────────────

type VenueType   = 'matriz' | 'quiosco' | 'cocina'
type Capability  = 'comida' | 'cerveza' | 'licor_fuerte'

interface Venue {
  id:           number
  name:         string
  type:         VenueType
  capabilities: Capability[]
  is_active:    boolean
  staff_count:  number
  created_at:   string
}

interface StaffMember {
  id:        number
  code:      string
  name:      string
  lastname:  string
  role:      string
  is_active: boolean
  venue:     { id: number; name: string } | null
}

interface FormState {
  name:         string
  type:         VenueType
  capabilities: Record<Capability, boolean>
  is_active:    boolean
}

// ── Static metadata ───────────────────────────────────────────────────────────

const TYPE_META: Record<VenueType, { label: string; cls: string; Icon: React.ElementType }> = {
  matriz:  { label: 'Matriz',  cls: styles.badgeMatriz,  Icon: Store      },
  quiosco: { label: 'Quiosco', cls: styles.badgeQuiosco, Icon: ShoppingBag },
  cocina:  { label: 'Cocina',  cls: styles.badgeCocina,  Icon: ChefHat    },
}

const CAP_META: Record<Capability, { label: string; cls: string }> = {
  comida:       { label: 'Comida',       cls: styles.capComida  },
  cerveza:      { label: 'Cerveza',      cls: styles.capCerveza },
  licor_fuerte: { label: 'Licor fuerte', cls: styles.capLicor   },
}

const ROLE_LABEL: Record<string, string> = {
  mesero: 'Mesero', cocina: 'Cocina', bar: 'Bar',
  despacho: 'Despacho', validador: 'Validador', admin: 'Admin',
}

const ROLE_CLS: Record<string, string> = {
  mesero:    styles.roleMesero,
  cocina:    styles.roleCocina,
  bar:       styles.roleBar,
  despacho:  styles.roleDespacho,
  validador: styles.roleValidador,
  admin:     styles.roleAdmin,
}

const CAPABILITIES: Capability[] = ['comida', 'cerveza', 'licor_fuerte']

const FORM_DEFAULT: FormState = {
  name:         '',
  type:         'quiosco',
  capabilities: { comida: false, cerveza: false, licor_fuerte: false },
  is_active:    true,
}

function venueToForm(v: Venue): FormState {
  return {
    name:  v.name,
    type:  v.type,
    capabilities: {
      comida:       v.capabilities.includes('comida'),
      cerveza:      v.capabilities.includes('cerveza'),
      licor_fuerte: v.capabilities.includes('licor_fuerte'),
    },
    is_active: v.is_active,
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EstructuraPage() {
  const [venues,   setVenues]   = useState<Venue[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [toggling, setToggling] = useState<number | null>(null)

  // create / edit modal
  const [modalOpen,    setModalOpen]    = useState(false)
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null)
  const [form,         setForm]         = useState<FormState>(FORM_DEFAULT)
  const [saving,       setSaving]       = useState(false)
  const [formError,    setFormError]    = useState<string | null>(null)

  // detail panel
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null)
  const [panelStaff,    setPanelStaff]    = useState<StaffMember[]>([])
  const [panelLoading,  setPanelLoading]  = useState(false)

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchVenues = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/venues')
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setVenues(data.venues)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar puntos de venta')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchVenues() }, [fetchVenues])

  // ── Toggle active ──────────────────────────────────────────────────────────

  async function handleToggle(e: React.MouseEvent, id: number, current: boolean) {
    e.stopPropagation()
    setToggling(id)
    try {
      const res  = await fetch(`/api/venues/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ is_active: !current }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setVenues((prev) => prev.map((v) => v.id === id ? { ...v, is_active: !current } : v))
      setSelectedVenue((prev) => prev?.id === id ? { ...prev, is_active: !current } : prev)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al actualizar')
    } finally {
      setToggling(null)
    }
  }

  // ── Open detail panel ──────────────────────────────────────────────────────

  const openDetail = useCallback(async (venue: Venue) => {
    setSelectedVenue(venue)
    setPanelStaff([])
    setPanelLoading(true)
    try {
      const res  = await fetch('/api/users')
      const data = await res.json()
      if (data.success) {
        setPanelStaff(
          (data.users as StaffMember[]).filter((u) => u.venue?.id === venue.id),
        )
      }
    } catch { /* non-blocking */ }
    finally { setPanelLoading(false) }
  }, [])

  // ── Modal helpers ──────────────────────────────────────────────────────────

  function openCreateModal() {
    setEditingVenue(null)
    setForm(FORM_DEFAULT)
    setFormError(null)
    setModalOpen(true)
  }

  function openEditModal(venue: Venue) {
    setEditingVenue(venue)
    setForm(venueToForm(venue))
    setFormError(null)
    setModalOpen(true)
  }

  // ── Submit (create or edit) ────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setFormError('El nombre es requerido'); return }

    setSaving(true)
    setFormError(null)

    const caps = CAPABILITIES.filter((c) => form.capabilities[c])
    const body = {
      name:         form.name.trim(),
      type:         form.type,
      capabilities: caps,
      is_active:    form.is_active,
    }

    try {
      const url    = editingVenue ? `/api/venues/${editingVenue.id}` : '/api/venues'
      const method = editingVenue ? 'PATCH' : 'POST'

      const res  = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      // Sync detail panel if the edited venue is open
      if (selectedVenue?.id === editingVenue?.id) {
        setSelectedVenue((prev) =>
          prev ? { ...prev, ...body, capabilities: caps } : null,
        )
      }

      setModalOpen(false)
      setEditingVenue(null)
      setForm(FORM_DEFAULT)
      await fetchVenues()
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  function updateCap(cap: Capability, value: boolean) {
    setForm((f) => ({ ...f, capabilities: { ...f.capabilities, [cap]: value } }))
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const isEditing = editingVenue !== null

  return (
    <div className={styles.page}>

      {/* Page header */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Estructura</h1>
          <p className={styles.subtitle}>Puntos de venta · Sport Bar</p>
        </div>

        <Dialog.Root
          open={modalOpen}
          onOpenChange={(open) => {
            setModalOpen(open)
            if (!open) { setEditingVenue(null); setForm(FORM_DEFAULT); setFormError(null) }
          }}
        >
          {/* Trigger wired to openCreateModal so state is set before Dialog opens */}
          <Dialog.Trigger asChild>
            <button type="button" className={styles.newBtn} onClick={openCreateModal}>
              <Plus size={16} aria-hidden />
              Nuevo Punto
            </button>
          </Dialog.Trigger>

          <Dialog.Portal>
            <Dialog.Overlay className={styles.overlay} />
            <Dialog.Content className={styles.modal} aria-describedby={undefined}>
              <div className={styles.modalHeader}>
                <Dialog.Title className={styles.modalTitle}>
                  {isEditing ? `Editar: ${editingVenue.name}` : 'Nuevo Punto de Venta'}
                </Dialog.Title>
                <Dialog.Close className={styles.modalClose} aria-label="Cerrar">
                  <X size={16} aria-hidden />
                </Dialog.Close>
              </div>

              <form onSubmit={handleSubmit} className={styles.form}>

                {/* Name */}
                <div className={styles.formField}>
                  <label htmlFor="venueName" className={styles.formLabel}>Nombre</label>
                  <input
                    id="venueName"
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Ej: Quiosco Norte"
                    maxLength={100}
                    autoComplete="off"
                    className={styles.formInput}
                    disabled={saving}
                  />
                </div>

                {/* Type */}
                <div className={styles.formField}>
                  <label htmlFor="venueType" className={styles.formLabel}>Tipo</label>
                  <select
                    id="venueType"
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as VenueType }))}
                    className={styles.formSelect}
                    disabled={saving}
                  >
                    <option value="matriz">Matriz</option>
                    <option value="quiosco">Quiosco</option>
                    <option value="cocina">Cocina</option>
                  </select>
                </div>

                {/* Capabilities */}
                <fieldset className={styles.formFieldset}>
                  <legend className={styles.formLabel}>Capacidades</legend>
                  <div className={styles.checkGroup}>
                    {CAPABILITIES.map((cap) => (
                      <label key={cap} className={styles.checkLabel}>
                        <input
                          type="checkbox"
                          checked={form.capabilities[cap]}
                          onChange={(e) => updateCap(cap, e.target.checked)}
                          disabled={saving}
                          className={styles.checkbox}
                        />
                        <span className={`${styles.capChip} ${CAP_META[cap].cls}`}>
                          {CAP_META[cap].label}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                {/* Active toggle */}
                <div className={styles.formToggleRow}>
                  <span className={styles.formLabel}>
                    {isEditing ? 'Activo' : 'Activo al crear'}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.is_active}
                    onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
                    disabled={saving}
                    className={`${styles.switch} ${form.is_active ? styles.switchOn : styles.switchOff}`}
                  >
                    <span className={styles.switchThumb} />
                  </button>
                </div>

                {formError && (
                  <p className={styles.formError}>
                    <AlertCircle size={13} aria-hidden />
                    {formError}
                  </p>
                )}

                <div className={styles.formActions}>
                  <Dialog.Close asChild>
                    <button type="button" className={styles.cancelBtn} disabled={saving}>
                      Cancelar
                    </button>
                  </Dialog.Close>
                  <button type="submit" className={styles.submitBtn} disabled={saving}>
                    {saving ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Crear punto'}
                  </button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </header>

      {/* States */}
      {loading && (
        <div className={styles.state}>
          <span className={styles.spinner} />
          <span className={styles.stateText}>Cargando puntos de venta…</span>
        </div>
      )}

      {error && (
        <div className={`${styles.state} ${styles.stateError}`}>
          <AlertCircle size={18} aria-hidden />
          <span className={styles.stateText}>{error}</span>
        </div>
      )}

      {/* Venue grid */}
      {!loading && !error && (
        <div className={styles.grid}>
          {venues.length === 0 && (
            <p className={styles.empty}>No hay puntos de venta registrados.</p>
          )}

          {venues.map((venue) => {
            const meta = TYPE_META[venue.type]
            const Icon = meta.Icon
            const caps = venue.capabilities as Capability[]
            const isSelected = selectedVenue?.id === venue.id

            return (
              <article
                key={venue.id}
                role="button"
                tabIndex={0}
                onClick={() => openDetail(venue)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(venue) }
                }}
                aria-label={`Ver detalle de ${venue.name}`}
                className={`${styles.card} ${!venue.is_active ? styles.cardInactive : ''} ${isSelected ? styles.cardSelected : ''}`}
              >
                {/* Card header: name + type badge */}
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardName}>{venue.name}</h2>
                  <span className={`${styles.badge} ${meta.cls}`}>
                    <Icon size={11} aria-hidden />
                    {meta.label}
                  </span>
                </div>

                {/* Capability chips */}
                <div className={styles.capRow}>
                  {CAPABILITIES.map((cap) =>
                    caps.includes(cap) ? (
                      <span key={cap} className={`${styles.capChip} ${CAP_META[cap].cls}`}>
                        {CAP_META[cap].label}
                      </span>
                    ) : null,
                  )}
                  {caps.length === 0 && (
                    <span className={styles.noCaps}>Sin capacidades</span>
                  )}
                </div>

                {/* Staff count */}
                <div className={styles.staffRow}>
                  <Users size={13} className={styles.staffIcon} aria-hidden />
                  <span className={styles.staffText}>
                    {venue.staff_count} colaborador{venue.staff_count !== 1 ? 'es' : ''}
                  </span>
                </div>

                {/* Active toggle */}
                <div className={styles.cardFooter}>
                  <button
                    type="button"
                    onClick={(e) => handleToggle(e, venue.id, venue.is_active)}
                    disabled={toggling === venue.id}
                    aria-label={venue.is_active ? 'Desactivar punto' : 'Activar punto'}
                    aria-pressed={venue.is_active}
                    className={`${styles.toggleBtn} ${venue.is_active ? styles.toggleOn : styles.toggleOff}`}
                  >
                    {venue.is_active
                      ? <Eye size={13} aria-hidden />
                      : <EyeOff size={13} aria-hidden />}
                    <span>{venue.is_active ? 'Activo' : 'Inactivo'}</span>
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* ── Detail panel ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedVenue && (
          <>
            {/* Backdrop */}
            <motion.div
              className={styles.panelBackdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setSelectedVenue(null)}
              aria-hidden
            />

            {/* Panel */}
            <motion.aside
              className={styles.detailPanel}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 34 }}
              aria-label={`Detalle de ${selectedVenue.name}`}
            >
              {/* Panel header */}
              <div className={styles.panelHeader}>
                <button
                  type="button"
                  className={styles.panelClose}
                  onClick={() => setSelectedVenue(null)}
                  aria-label="Cerrar panel"
                >
                  <X size={16} aria-hidden />
                </button>
                <button
                  type="button"
                  className={styles.panelEditBtn}
                  onClick={() => openEditModal(selectedVenue)}
                >
                  <Pencil size={13} aria-hidden />
                  Editar
                </button>
              </div>

              {/* Venue identity */}
              <div className={styles.panelVenueInfo}>
                {(() => {
                  const meta = TYPE_META[selectedVenue.type]
                  const Icon = meta.Icon
                  return (
                    <>
                      <h2 className={styles.panelVenueName}>{selectedVenue.name}</h2>
                      <span className={`${styles.badge} ${meta.cls}`}>
                        <Icon size={11} aria-hidden />
                        {meta.label}
                      </span>
                    </>
                  )
                })()}
              </div>

              {/* Capabilities */}
              <section className={styles.panelSection}>
                <h3 className={styles.panelSectionTitle}>Capacidades</h3>
                <div className={styles.capRow}>
                  {selectedVenue.capabilities.length === 0
                    ? <span className={styles.noCaps}>Sin capacidades asignadas</span>
                    : selectedVenue.capabilities.map((cap) => (
                        <span key={cap} className={`${styles.capChip} ${CAP_META[cap].cls}`}>
                          {CAP_META[cap].label}
                        </span>
                      ))
                  }
                </div>
              </section>

              {/* Staff list */}
              <section className={styles.panelSection}>
                <h3 className={styles.panelSectionTitle}>
                  Equipo asignado
                  {!panelLoading && (
                    <span className={styles.panelCount}>{panelStaff.length}</span>
                  )}
                </h3>

                {panelLoading && (
                  <div className={styles.panelSpinnerRow}>
                    <span className={styles.spinner} />
                    <span className={styles.stateText}>Cargando…</span>
                  </div>
                )}

                {!panelLoading && panelStaff.length === 0 && (
                  <p className={styles.panelEmpty}>Sin colaboradores asignados</p>
                )}

                {!panelLoading && panelStaff.length > 0 && (
                  <ul className={styles.staffList}>
                    {panelStaff.map((u) => (
                      <li
                        key={u.id}
                        className={`${styles.staffItem} ${!u.is_active ? styles.staffItemInactive : ''}`}
                      >
                        <div className={styles.staffAvatar}>
                          {(u.name[0] ?? '').toUpperCase()}{(u.lastname[0] ?? '').toUpperCase()}
                        </div>
                        <div className={styles.staffInfo}>
                          <span className={styles.staffName}>{u.name} {u.lastname}</span>
                          <span className={styles.staffCode}>{u.code}</span>
                        </div>
                        <span className={`${styles.rolePill} ${ROLE_CLS[u.role] ?? ''}`}>
                          {ROLE_LABEL[u.role] ?? u.role}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
