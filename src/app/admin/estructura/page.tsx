'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircle, Check, ChefHat, ChevronDown, ChevronUp, CreditCard,
  MapPin, Pencil, Plus, RefreshCw, ShoppingBag, Store,
  Trash2, UserCheck, Users, X,
} from 'lucide-react'
import styles from './page.module.css'

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab       = 'zonas' | 'quioscos' | 'asignaciones'
type VenueType = 'matriz' | 'quiosco' | 'cocina'

interface Zone {
  id:        number
  name:      string
  color:     string
  capacity:  number
  is_active: boolean
  _count:    { venueZones: number }
}

interface VenueZoneRef { zone_id: number }

interface Venue {
  id:           number
  name:         string
  type:         VenueType
  capabilities: string[]
  is_active:    boolean
  _count:       { users: number; venueZones: number }
  venueZones:   VenueZoneRef[]
}

interface StaffUser {
  id:        number
  code:      string
  name:      string
  lastname:  string
  role:      string
  is_active: boolean
}

interface VenuePayMethod { method: string; is_active: boolean }

interface GlobalPayMethod { id: number; name: string; type: string }

interface VenueExpanded {
  zones:   Zone[]
  users:   StaffUser[]
  methods: VenuePayMethod[]
  loading: boolean
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ZONE_PRESETS = ['#22c55e', '#F5A623', '#C62828', '#1565C0', '#7C3AED', '#0891B2']

const FALLBACK_METHODS = [
  'Efectivo', 'Pago Móvil', 'Zelle', 'Punto de Venta Débito',
  'Punto de Venta Crédito', 'Transferencia', 'Biopago',
]

const TYPE_META: Record<VenueType, { label: string; Icon: React.ElementType }> = {
  matriz:  { label: 'Matriz',  Icon: Store      },
  quiosco: { label: 'Quiosco', Icon: ShoppingBag },
  cocina:  { label: 'Cocina',  Icon: ChefHat    },
}

const ROLE_LABEL: Record<string, string> = {
  mesero: 'Mesero', cocina: 'Cocina', bar: 'Bar',
  despacho: 'Despacho', validador: 'Validador', admin: 'Admin',
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'zonas',        label: 'Zonas'        },
  { key: 'quioscos',     label: 'Quioscos'     },
  { key: 'asignaciones', label: 'Asignaciones' },
]

const ZONE_FORM_DEFAULT = { name: '', color: ZONE_PRESETS[0], capacity: 0 }

// ── Component ─────────────────────────────────────────────────────────────────

export default function EstructuraPage() {
  const [activeTab, setActiveTab] = useState<Tab>('zonas')

  // Shared data
  const [zones,          setZones]          = useState<Zone[]>([])
  const [venues,         setVenues]         = useState<Venue[]>([])
  const [allUsers,       setAllUsers]       = useState<StaffUser[]>([])
  const [globalMethods,  setGlobalMethods]  = useState<string[]>(FALLBACK_METHODS)
  const [dataLoading,    setDataLoading]    = useState(true)
  const [dataError,      setDataError]      = useState<string | null>(null)

  // Tab 1 — Zonas
  const [zoneModalOpen, setZoneModalOpen] = useState(false)
  const [editingZone,   setEditingZone]   = useState<Zone | null>(null)
  const [zoneForm,      setZoneForm]      = useState(ZONE_FORM_DEFAULT)
  const [zoneSaving,    setZoneSaving]    = useState(false)
  const [zoneFormErr,   setZoneFormErr]   = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [zoneToggling,  setZoneToggling]  = useState<number | null>(null)
  const customColorRef = useRef<HTMLInputElement>(null)

  // Tab 2 — Quioscos
  const [expandedId,    setExpandedId]    = useState<number | null>(null)
  const [venueExpanded, setVenueExpanded] = useState<Record<number, VenueExpanded>>({})
  const [venueToggling, setVenueToggling] = useState<number | null>(null)

  // Tab 3 — Matrix
  const [matrixBusy, setMatrixBusy] = useState<string | null>(null)

  // ── Load all ───────────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    setDataLoading(true)
    setDataError(null)
    try {
      const [zRes, vRes, uRes, pmRes] = await Promise.all([
        fetch('/api/zones').then(r => r.json()),
        fetch('/api/venues').then(r => r.json()),
        fetch('/api/users').then(r => r.json()),
        fetch('/api/payment-methods').then(r => r.json()),
      ])
      if ((zRes as { success: boolean; zones?: Zone[] }).success)
        setZones((zRes as { zones: Zone[] }).zones)
      if ((vRes as { success: boolean; venues?: Venue[] }).success)
        setVenues((vRes as { venues: Venue[] }).venues)
      if ((uRes as { success: boolean; users?: StaffUser[] }).success)
        setAllUsers((uRes as { users: StaffUser[] }).users)
      if ((pmRes as { success: boolean; methods?: GlobalPayMethod[] }).success) {
        const ms = (pmRes as { methods: GlobalPayMethod[] }).methods
        if (ms.length) setGlobalMethods(ms.map(m => m.name))
      }
    } catch (e: unknown) {
      setDataError(e instanceof Error ? e.message : 'Error al cargar datos')
    } finally {
      setDataLoading(false)
    }
  }, [])

  useEffect(() => { void loadAll() }, [loadAll])

  // ── Expand venue ───────────────────────────────────────────────────────────

  const expandVenue = useCallback(async (id: number) => {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    if (venueExpanded[id]) return
    setVenueExpanded(prev => ({ ...prev, [id]: { zones: [], users: [], methods: [], loading: true } }))
    try {
      const [zRes, uRes, mRes] = await Promise.all([
        fetch(`/api/venues/${id}/zones`).then(r => r.json()),
        fetch(`/api/venues/${id}/users`).then(r => r.json()),
        fetch(`/api/venues/${id}/payment-methods`).then(r => r.json()),
      ])
      setVenueExpanded(prev => ({
        ...prev,
        [id]: {
          zones:   (zRes as { success: boolean; zones?: Zone[] }).success      ? (zRes as { zones: Zone[] }).zones         : [],
          users:   (uRes as { success: boolean; users?: StaffUser[] }).success  ? (uRes as { users: StaffUser[] }).users     : [],
          methods: (mRes as { success: boolean; methods?: VenuePayMethod[] }).success ? (mRes as { methods: VenuePayMethod[] }).methods : [],
          loading: false,
        },
      }))
    } catch {
      setVenueExpanded(prev => ({ ...prev, [id]: { zones: [], users: [], methods: [], loading: false } }))
    }
  }, [expandedId, venueExpanded])

  // ── Tab 1 handlers ────────────────────────────────────────────────────────

  function openZoneCreate() {
    setEditingZone(null); setZoneForm(ZONE_FORM_DEFAULT); setZoneFormErr(null); setZoneModalOpen(true)
  }
  function openZoneEdit(z: Zone) {
    setEditingZone(z); setZoneForm({ name: z.name, color: z.color, capacity: z.capacity }); setZoneFormErr(null); setZoneModalOpen(true)
  }

  async function handleZoneSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!zoneForm.name.trim()) { setZoneFormErr('El nombre es requerido'); return }
    setZoneSaving(true); setZoneFormErr(null)
    try {
      const url    = editingZone ? `/api/zones/${editingZone.id}` : '/api/zones'
      const method = editingZone ? 'PUT' : 'POST'
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: zoneForm.name.trim(), color: zoneForm.color, capacity: zoneForm.capacity }),
      })
      const data = await res.json() as { success: boolean; error?: string; errors?: string[] }
      if (!data.success) throw new Error(data.error ?? data.errors?.join(', ') ?? 'Error')
      setZoneModalOpen(false)
      await loadAll()
    } catch (err: unknown) {
      setZoneFormErr(err instanceof Error ? err.message : 'Error al guardar')
    } finally { setZoneSaving(false) }
  }

  async function handleToggleZone(id: number, current: boolean) {
    setZoneToggling(id)
    try {
      const res  = await fetch(`/api/zones/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body:   JSON.stringify({ is_active: !current }),
      })
      const data = await res.json() as { success: boolean }
      if (!data.success) return
      setZones(prev => prev.map(z => z.id === id ? { ...z, is_active: !current } : z))
    } catch { /* ignore */ } finally { setZoneToggling(null) }
  }

  async function handleDeleteZone(id: number) {
    try {
      await fetch(`/api/zones/${id}`, { method: 'DELETE' })
      setDeleteConfirm(null)
      await loadAll()
    } catch { /* ignore */ }
  }

  // ── Tab 2 handlers ────────────────────────────────────────────────────────

  async function handleToggleVenue(e: React.MouseEvent, id: number, current: boolean) {
    e.stopPropagation()
    setVenueToggling(id)
    try {
      const res  = await fetch(`/api/venues/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body:   JSON.stringify({ is_active: !current }),
      })
      const data = await res.json() as { success: boolean }
      if (!data.success) return
      setVenues(prev => prev.map(v => v.id === id ? { ...v, is_active: !current } : v))
    } catch { /* ignore */ } finally { setVenueToggling(null) }
  }

  async function unassignZone(venueId: number, zoneId: number) {
    await fetch(`/api/venues/${venueId}/zones?zone_id=${zoneId}`, { method: 'DELETE' })
    setVenueExpanded(prev => {
      const e = prev[venueId]
      if (!e) return prev
      return { ...prev, [venueId]: { ...e, zones: e.zones.filter(z => z.id !== zoneId) } }
    })
    setVenues(prev => prev.map(v => v.id === venueId
      ? { ...v, venueZones: v.venueZones.filter(vz => vz.zone_id !== zoneId), _count: { ...v._count, venueZones: v._count.venueZones - 1 } }
      : v))
  }

  async function assignZone(venueId: number, zoneId: number) {
    const res  = await fetch(`/api/venues/${venueId}/zones`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body:   JSON.stringify({ zone_id: zoneId }),
    })
    const data = await res.json() as { success: boolean }
    if (!data.success) return
    setVenueExpanded(prev => {
      const e = prev[venueId]; if (!e) return prev
      const zone = zones.find(z => z.id === zoneId); if (!zone) return prev
      return { ...prev, [venueId]: { ...e, zones: [...e.zones, zone] } }
    })
    setVenues(prev => prev.map(v => v.id === venueId
      ? { ...v, venueZones: [...v.venueZones, { zone_id: zoneId }], _count: { ...v._count, venueZones: v._count.venueZones + 1 } }
      : v))
  }

  async function unassignUser(venueId: number, userId: number) {
    await fetch(`/api/venues/${venueId}/users?user_id=${userId}`, { method: 'DELETE' })
    setVenueExpanded(prev => {
      const e = prev[venueId]; if (!e) return prev
      return { ...prev, [venueId]: { ...e, users: e.users.filter(u => u.id !== userId) } }
    })
    setVenues(prev => prev.map(v => v.id === venueId ? { ...v, _count: { ...v._count, users: v._count.users - 1 } } : v))
  }

  async function assignUser(venueId: number, userId: number) {
    const res  = await fetch(`/api/venues/${venueId}/users`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body:   JSON.stringify({ user_id: userId }),
    })
    const data = await res.json() as { success: boolean }
    if (!data.success) return
    setVenueExpanded(prev => {
      const e = prev[venueId]; if (!e) return prev
      const user = allUsers.find(u => u.id === userId); if (!user) return prev
      return { ...prev, [venueId]: { ...e, users: [...e.users, user] } }
    })
    setVenues(prev => prev.map(v => v.id === venueId ? { ...v, _count: { ...v._count, users: v._count.users + 1 } } : v))
  }

  async function togglePayMethod(venueId: number, method: string, currentActive: boolean | null) {
    if (currentActive === null) {
      await fetch(`/api/venues/${venueId}/payment-methods`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body:   JSON.stringify({ method, is_active: true }),
      })
      setVenueExpanded(prev => {
        const e = prev[venueId]; if (!e) return prev
        return { ...prev, [venueId]: { ...e, methods: [...e.methods, { method, is_active: true }] } }
      })
    } else {
      await fetch(`/api/venues/${venueId}/payment-methods`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body:   JSON.stringify({ method, is_active: !currentActive }),
      })
      setVenueExpanded(prev => {
        const e = prev[venueId]; if (!e) return prev
        return { ...prev, [venueId]: { ...e, methods: e.methods.map(m => m.method === method ? { ...m, is_active: !currentActive } : m) } }
      })
    }
  }

  // ── Tab 3 — Matrix ────────────────────────────────────────────────────────

  async function handleMatrixToggle(venueId: number, zoneId: number, assigned: boolean) {
    const key = `${venueId}-${zoneId}`
    setMatrixBusy(key)
    try {
      if (assigned) {
        await fetch(`/api/venues/${venueId}/zones?zone_id=${zoneId}`, { method: 'DELETE' })
        setVenues(prev => prev.map(v => v.id === venueId
          ? { ...v, venueZones: v.venueZones.filter(vz => vz.zone_id !== zoneId) } : v))
      } else {
        await fetch(`/api/venues/${venueId}/zones`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body:   JSON.stringify({ zone_id: zoneId }),
        })
        setVenues(prev => prev.map(v => v.id === venueId
          ? { ...v, venueZones: [...v.venueZones, { zone_id: zoneId }] } : v))
      }
    } catch { /* ignore */ } finally { setMatrixBusy(null) }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>Estructura</h1>
          <p className={styles.pageSub}>Zonas · Quioscos · Asignaciones</p>
        </div>
        {activeTab === 'zonas' && (
          <button className={styles.btnPrimary} onClick={openZoneCreate}>
            <Plus size={16} aria-hidden />
            Nueva Zona
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className={styles.tabs} role="tablist">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={activeTab === key}
            className={`${styles.tab} ${activeTab === key ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Global states */}
      {dataLoading && (
        <div className={styles.state}>
          <RefreshCw size={18} className={styles.spin} aria-hidden />
          <span>Cargando…</span>
        </div>
      )}
      {dataError && (
        <div className={`${styles.state} ${styles.stateError}`}>
          <AlertCircle size={18} aria-hidden /><span>{dataError}</span>
        </div>
      )}

      {!dataLoading && !dataError && (
        <>
          {/* ── TAB 1: ZONAS ──────────────────────────────────────────────── */}
          {activeTab === 'zonas' && (
            <div className={styles.zoneList}>
              {zones.length === 0 && <p className={styles.empty}>No hay zonas. Crea la primera.</p>}
              {zones.map(z => (
                <div key={z.id} className={`${styles.zoneRow} ${!z.is_active ? styles.zoneRowInactive : ''}`}>
                  <span className={styles.zoneDot} style={{ background: z.color }} />
                  <div className={styles.zoneInfo}>
                    <span className={styles.zoneName}>{z.name}</span>
                    <span className={styles.zoneMeta}>
                      Cap.&nbsp;{z.capacity} · {z._count.venueZones} quiosco{z._count.venueZones !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className={`${styles.activeBadge} ${z.is_active ? styles.activeBadgeOn : styles.activeBadgeOff}`}>
                    {z.is_active ? 'Activa' : 'Inactiva'}
                  </span>
                  {deleteConfirm === z.id ? (
                    <div className={styles.deleteConfirm}>
                      <span className={styles.deleteConfirmText}>¿Eliminar?</span>
                      <button className={styles.btnDanger} onClick={() => void handleDeleteZone(z.id)}>Sí</button>
                      <button className={styles.btnGhost} onClick={() => setDeleteConfirm(null)}>No</button>
                    </div>
                  ) : (
                    <div className={styles.zoneActions}>
                      <button
                        className={`${styles.iconBtn} ${z.is_active ? styles.iconBtnOn : ''}`}
                        title={z.is_active ? 'Desactivar' : 'Activar'}
                        disabled={zoneToggling === z.id}
                        onClick={() => void handleToggleZone(z.id, z.is_active)}
                      >
                        <Check size={15} aria-hidden />
                      </button>
                      <button className={styles.iconBtn} title="Editar" onClick={() => openZoneEdit(z)}>
                        <Pencil size={15} aria-hidden />
                      </button>
                      <button
                        className={`${styles.iconBtn} ${styles.iconBtnDel}`}
                        title="Eliminar"
                        onClick={() => setDeleteConfirm(z.id)}
                      >
                        <Trash2 size={15} aria-hidden />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── TAB 2: QUIOSCOS ───────────────────────────────────────────── */}
          {activeTab === 'quioscos' && (
            <div className={styles.venueList}>
              {venues.length === 0 && <p className={styles.empty}>No hay quioscos.</p>}
              {venues.map(v => {
                const { label, Icon } = TYPE_META[v.type]
                const isExpanded      = expandedId === v.id
                const expData         = venueExpanded[v.id]
                return (
                  <div key={v.id} className={`${styles.venueCard} ${!v.is_active ? styles.venueCardInactive : ''}`}>
                    <button
                      className={styles.venueCardHeader}
                      onClick={() => void expandVenue(v.id)}
                      aria-expanded={isExpanded}
                    >
                      <div className={styles.venueCardLeft}>
                        <span className={styles.venueTypeIcon}><Icon size={15} aria-hidden /></span>
                        <div>
                          <span className={styles.venueName}>{v.name}</span>
                          <span className={styles.venueMeta}>
                            {label} · {v._count.users} personas · {v._count.venueZones} zonas
                          </span>
                        </div>
                      </div>
                      <div className={styles.venueCardRight}>
                        <button
                          className={`${styles.toggleBtn} ${v.is_active ? styles.toggleBtnOn : ''}`}
                          disabled={venueToggling === v.id}
                          onClick={e => void handleToggleVenue(e, v.id, v.is_active)}
                          aria-pressed={v.is_active}
                        >
                          {v.is_active ? 'Activo' : 'Inactivo'}
                        </button>
                        {isExpanded ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className={styles.venueCardBody}>
                        {expData?.loading && (
                          <div className={styles.state}>
                            <RefreshCw size={14} className={styles.spin} aria-hidden /><span>Cargando…</span>
                          </div>
                        )}
                        {expData && !expData.loading && (
                          <>
                            {/* Zonas */}
                            <div className={styles.expandSection}>
                              <div className={styles.expandSectionHead}>
                                <MapPin size={13} aria-hidden /><span>Zonas que atiende</span>
                              </div>
                              <div className={styles.chipRow}>
                                {expData.zones.map(z => (
                                  <span key={z.id} className={styles.chip} style={{ '--chip-color': z.color } as React.CSSProperties}>
                                    <span className={styles.chipDot} />
                                    {z.name}
                                    <button className={styles.chipX} onClick={() => void unassignZone(v.id, z.id)} aria-label={`Quitar ${z.name}`}>
                                      <X size={11} aria-hidden />
                                    </button>
                                  </span>
                                ))}
                                {zones.filter(z => !expData.zones.some(ez => ez.id === z.id)).length > 0 && (
                                  <select
                                    className={styles.addSelect}
                                    value=""
                                    onChange={e => { if (e.target.value) void assignZone(v.id, parseInt(e.target.value)) }}
                                  >
                                    <option value="">+ Agregar zona</option>
                                    {zones
                                      .filter(z => !expData.zones.some(ez => ez.id === z.id))
                                      .map(z => <option key={z.id} value={z.id}>{z.name}</option>)
                                    }
                                  </select>
                                )}
                                {expData.zones.length === 0 && zones.length === 0 && (
                                  <span className={styles.emptyChip}>Sin zonas disponibles</span>
                                )}
                              </div>
                            </div>

                            {/* Personal */}
                            <div className={styles.expandSection}>
                              <div className={styles.expandSectionHead}>
                                <Users size={13} aria-hidden /><span>Personal asignado</span>
                              </div>
                              <div className={styles.chipRow}>
                                {expData.users.map(u => (
                                  <span key={u.id} className={`${styles.chip} ${styles.chipUser}`}>
                                    <UserCheck size={11} aria-hidden />
                                    {u.name}&nbsp;{u.lastname}
                                    <span className={styles.chipRole}>{ROLE_LABEL[u.role] ?? u.role}</span>
                                    <button className={styles.chipX} onClick={() => void unassignUser(v.id, u.id)} aria-label={`Quitar ${u.name}`}>
                                      <X size={11} aria-hidden />
                                    </button>
                                  </span>
                                ))}
                                {allUsers.filter(u => !expData.users.some(eu => eu.id === u.id)).length > 0 && (
                                  <select
                                    className={styles.addSelect}
                                    value=""
                                    onChange={e => { if (e.target.value) void assignUser(v.id, parseInt(e.target.value)) }}
                                  >
                                    <option value="">+ Agregar persona</option>
                                    {allUsers
                                      .filter(u => !expData.users.some(eu => eu.id === u.id))
                                      .map(u => (
                                        <option key={u.id} value={u.id}>
                                          {u.name} {u.lastname} ({ROLE_LABEL[u.role] ?? u.role})
                                        </option>
                                      ))
                                    }
                                  </select>
                                )}
                              </div>
                            </div>

                            {/* Métodos de pago */}
                            <div className={styles.expandSection}>
                              <div className={styles.expandSectionHead}>
                                <CreditCard size={13} aria-hidden /><span>Métodos de pago</span>
                              </div>
                              <div className={styles.methodGrid}>
                                {globalMethods.map(method => {
                                  const existing = expData.methods.find(m => m.method === method)
                                  const active   = existing?.is_active ?? false
                                  const present  = existing !== undefined
                                  return (
                                    <label key={method} className={`${styles.methodCheck} ${active ? styles.methodCheckOn : ''}`}>
                                      <input
                                        type="checkbox"
                                        checked={active}
                                        onChange={() => void togglePayMethod(v.id, method, present ? active : null)}
                                        className={styles.methodCheckInput}
                                      />
                                      <span>{method}</span>
                                    </label>
                                  )
                                })}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── TAB 3: ASIGNACIONES ───────────────────────────────────────── */}
          {activeTab === 'asignaciones' && (
            <div className={styles.matrixWrap}>
              {zones.length === 0 || venues.length === 0 ? (
                <p className={styles.empty}>Crea zonas y quioscos para ver la matriz.</p>
              ) : (
                <div className={styles.matrixScroll}>
                  <table className={styles.matrix}>
                    <thead>
                      <tr>
                        <th className={styles.matrixCorner}>Zona / Quiosco</th>
                        {venues.map(v => (
                          <th key={v.id} className={styles.matrixHead}>
                            <span className={styles.matrixHeadName}>{v.name}</span>
                            <span className={styles.matrixHeadType}>{TYPE_META[v.type].label}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {zones.map(z => (
                        <tr key={z.id}>
                          <td className={styles.matrixZoneCell}>
                            <span className={styles.matrixZoneDot} style={{ background: z.color }} />
                            <span>{z.name}</span>
                          </td>
                          {venues.map(v => {
                            const assigned = v.venueZones.some(vz => vz.zone_id === z.id)
                            const busy     = matrixBusy === `${v.id}-${z.id}`
                            return (
                              <td key={v.id} className={styles.matrixCell}>
                                <button
                                  className={`${styles.matrixToggle} ${assigned ? styles.matrixToggleOn : ''}`}
                                  onClick={() => void handleMatrixToggle(v.id, z.id, assigned)}
                                  disabled={busy}
                                  aria-label={`${assigned ? 'Desasignar' : 'Asignar'} ${z.name} a ${v.name}`}
                                  aria-pressed={assigned}
                                >
                                  {busy
                                    ? <RefreshCw size={12} className={styles.spin} aria-hidden />
                                    : assigned
                                    ? <Check size={14} aria-hidden />
                                    : null
                                  }
                                </button>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Zone Modal ──────────────────────────────────────────────────────── */}
      {zoneModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setZoneModalOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {editingZone ? `Editar: ${editingZone.name}` : 'Nueva Zona'}
              </h2>
              <button className={styles.modalClose} onClick={() => setZoneModalOpen(false)} aria-label="Cerrar">
                <X size={16} aria-hidden />
              </button>
            </div>

            <form onSubmit={e => void handleZoneSubmit(e)} className={styles.form}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Nombre</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={zoneForm.name}
                  onChange={e => setZoneForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ej: Zona Norte"
                  maxLength={80}
                  autoFocus
                  disabled={zoneSaving}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Capacidad (personas)</label>
                <input
                  type="number"
                  className={styles.formInput}
                  min={0}
                  max={9999}
                  value={zoneForm.capacity}
                  onChange={e => setZoneForm(f => ({ ...f, capacity: parseInt(e.target.value) || 0 }))}
                  disabled={zoneSaving}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Color</label>
                <div className={styles.colorPickerRow}>
                  {ZONE_PRESETS.map(c => (
                    <button
                      key={c}
                      type="button"
                      className={`${styles.colorSwatch} ${zoneForm.color === c ? styles.colorSwatchSel : ''}`}
                      style={{ background: c }}
                      onClick={() => setZoneForm(f => ({ ...f, color: c }))}
                      aria-label={c}
                      disabled={zoneSaving}
                    />
                  ))}
                  <div
                    className={`${styles.colorSwatchCustom} ${!ZONE_PRESETS.includes(zoneForm.color) ? styles.colorSwatchSel : ''}`}
                    style={{ background: ZONE_PRESETS.includes(zoneForm.color) ? 'var(--color-surface-2)' : zoneForm.color }}
                    onClick={() => customColorRef.current?.click()}
                    title="Personalizado"
                  >
                    <Pencil size={10} aria-hidden />
                    <input
                      ref={customColorRef}
                      type="color"
                      className={styles.colorInputHidden}
                      value={zoneForm.color}
                      onChange={e => setZoneForm(f => ({ ...f, color: e.target.value }))}
                    />
                  </div>
                </div>
                <div className={styles.colorPreview}>
                  <span className={styles.colorPreviewDot} style={{ background: zoneForm.color }} />
                  <code className={styles.colorPreviewHex}>{zoneForm.color}</code>
                </div>
              </div>

              {zoneFormErr && (
                <p className={styles.formError}>
                  <AlertCircle size={13} aria-hidden /> {zoneFormErr}
                </p>
              )}

              <div className={styles.formActions}>
                <button type="button" className={styles.btnGhost} onClick={() => setZoneModalOpen(false)} disabled={zoneSaving}>
                  Cancelar
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={zoneSaving}>
                  {zoneSaving ? 'Guardando…' : editingZone ? 'Guardar cambios' : 'Crear zona'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
