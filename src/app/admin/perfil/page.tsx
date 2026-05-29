'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  FileText,
  Image,
  MapPin,
  Phone,
  Printer,
  Save,
  Trophy,
  User,
} from 'lucide-react'
import styles from './page.module.css'

// ── Types ─────────────────────────────────────────────────────────────────────

interface BusinessProfile {
  business_name:     string
  business_subtitle: string
  business_rif:      string
  business_phone:    string
  business_address:  string
  business_city:     string
  business_logo_url: string
  ticket_footer:     string
  ticket_show_bs:    string
  ticket_width_mm:   string
  event_name:        string
  event_venue:       string
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PerfilPage() {
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [toast,    setToast]    = useState<string | null>(null)
  const [error,    setError]    = useState<string | null>(null)
  const [profile,  setProfile]  = useState<BusinessProfile>({
    business_name:     'Sport Bar',
    business_subtitle: 'Guaiqueríes de Margarita',
    business_rif:      '',
    business_phone:    '',
    business_address:  '',
    business_city:     'Margarita, Venezuela',
    business_logo_url: '',
    ticket_footer:     'Gracias por su visita',
    ticket_show_bs:    'true',
    ticket_width_mm:   '58',
    event_name:        '',
    event_venue:       '',
  })

  const logoInputRef = useRef<HTMLInputElement>(null)

  // ── Load ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch('/api/config/business')
      .then((r) => r.json())
      .then((data: { success: boolean; profile?: BusinessProfile; error?: string }) => {
        if (data.success && data.profile) setProfile(data.profile)
        else setError(data.error ?? 'Error al cargar perfil')
      })
      .catch(() => setError('Error de red'))
      .finally(() => setLoading(false))
  }, [])

  // ── Helpers ────────────────────────────────────────────────────────────────

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  function set(key: keyof BusinessProfile, value: string) {
    setProfile((p) => ({ ...p, [key]: value }))
  }

  // ── Save section ──────────────────────────────────────────────────────────

  const saveSection = useCallback(
    async (keys: (keyof BusinessProfile)[]) => {
      setSaving(true)
      try {
        const payload: Partial<BusinessProfile> = {}
        for (const k of keys) payload[k] = profile[k]

        const res  = await fetch('/api/config/business', {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        })
        const data: { success: boolean; error?: string } = await res.json()
        if (!data.success) throw new Error(data.error ?? 'Error al guardar')
        showToast('Guardado correctamente')
      } catch (e: unknown) {
        showToast(e instanceof Error ? e.message : 'Error al guardar')
      } finally {
        setSaving(false)
      }
    },
    [profile],
  )

  // ── Logo upload (simulado — guarda URL) ──────────────────────────────────

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // En producción: upload a /api/products/[id]/upload o similar
    // Por ahora genera preview local y avisa al usuario
    const url = URL.createObjectURL(file)
    set('business_logo_url', url)
    showToast('Logo cargado localmente — guarda para confirmar')
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
      </div>
    )
  }

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <header className={styles.header}>
        <Link href="/admin" className={styles.backBtn} aria-label="Volver">
          <ArrowLeft size={16} />
        </Link>
        <div className={styles.headerText}>
          <span className={styles.pageTitle}>Perfil del Negocio</span>
          <span className={styles.pageSub}>Datos · Logo · Ticket · Evento</span>
        </div>
        <Building2 size={18} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
      </header>

      {error && (
        <div className={styles.errorBanner} role="alert">{error}</div>
      )}

      {/* ── 1. Información del negocio ── */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionLabel}>
            <Building2 size={13} aria-hidden />
            Información del negocio
          </div>
        </div>
        <div className={styles.card}>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="biz-name">
              <User size={12} aria-hidden />
              Nombre del negocio
            </label>
            <input
              id="biz-name"
              className={styles.input}
              value={profile.business_name}
              onChange={(e) => set('business_name', e.target.value)}
              placeholder="Sport Bar"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="biz-sub">
              <Building2 size={12} aria-hidden />
              Subtítulo / Eslogan
            </label>
            <input
              id="biz-sub"
              className={styles.input}
              value={profile.business_subtitle}
              onChange={(e) => set('business_subtitle', e.target.value)}
              placeholder="Guaiqueríes de Margarita"
            />
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="biz-rif">
                <FileText size={12} aria-hidden />
                RIF
              </label>
              <input
                id="biz-rif"
                className={styles.input}
                value={profile.business_rif}
                onChange={(e) => set('business_rif', e.target.value)}
                placeholder="J-12345678-9"
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="biz-phone">
                <Phone size={12} aria-hidden />
                Teléfono
              </label>
              <input
                id="biz-phone"
                className={styles.input}
                value={profile.business_phone}
                onChange={(e) => set('business_phone', e.target.value)}
                placeholder="0414-000-0000"
              />
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="biz-addr">
              <MapPin size={12} aria-hidden />
              Dirección
            </label>
            <input
              id="biz-addr"
              className={styles.input}
              value={profile.business_address}
              onChange={(e) => set('business_address', e.target.value)}
              placeholder="Av. Principal, Local 1"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="biz-city">
              <MapPin size={12} aria-hidden />
              Ciudad / Región
            </label>
            <input
              id="biz-city"
              className={styles.input}
              value={profile.business_city}
              onChange={(e) => set('business_city', e.target.value)}
              placeholder="Margarita, Venezuela"
            />
          </div>

        </div>
        <button
          className={styles.btnSave}
          onClick={() => saveSection([
            'business_name', 'business_subtitle', 'business_rif',
            'business_phone', 'business_address', 'business_city',
          ])}
          disabled={saving}
        >
          <Save size={14} aria-hidden />
          {saving ? 'Guardando…' : 'Guardar información'}
        </button>
      </section>

      {/* ── 2. Logo ── */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionLabel}>
            <Image size={13} aria-hidden />
            Logo del negocio
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.logoArea}>
            <div className={styles.logoPreview}>
              {profile.business_logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.business_logo_url}
                  alt="Logo del negocio"
                  className={styles.logoImg}
                />
              ) : (
                <div className={styles.logoPlaceholder}>
                  <Building2 size={32} strokeWidth={1} style={{ color: 'var(--color-text-muted)' }} />
                </div>
              )}
            </div>
            <div className={styles.logoActions}>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                style={{ display: 'none' }}
                onChange={handleLogoChange}
              />
              <button
                className={styles.btnSecondary}
                onClick={() => logoInputRef.current?.click()}
              >
                <Image size={14} aria-hidden />
                Seleccionar imagen
              </button>
              <p className={styles.logoHint}>
                PNG, JPG o SVG recomendado. Se muestra en ticket y cabecera.
              </p>
              {profile.business_logo_url && (
                <div className={styles.fieldGroup} style={{ marginTop: 8 }}>
                  <label className={styles.label}>URL del logo</label>
                  <input
                    className={styles.input}
                    value={profile.business_logo_url}
                    onChange={(e) => set('business_logo_url', e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        <button
          className={styles.btnSave}
          onClick={() => saveSection(['business_logo_url'])}
          disabled={saving}
        >
          <Save size={14} aria-hidden />
          {saving ? 'Guardando…' : 'Guardar logo'}
        </button>
      </section>

      {/* ── 3. Configuración de ticket ── */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionLabel}>
            <Printer size={13} aria-hidden />
            Configuración de ticket
          </div>
        </div>
        <div className={styles.card}>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="ticket-footer">
              <FileText size={12} aria-hidden />
              Pie del ticket
            </label>
            <input
              id="ticket-footer"
              className={styles.input}
              value={profile.ticket_footer}
              onChange={(e) => set('ticket_footer', e.target.value)}
              placeholder="Gracias por su visita"
            />
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Ancho del ticket</label>
              <div className={styles.pillGroup}>
                {(['58', '80'] as const).map((w) => (
                  <button
                    key={w}
                    type="button"
                    className={`${styles.pill} ${profile.ticket_width_mm === w ? styles.pillActive : ''}`}
                    onClick={() => set('ticket_width_mm', w)}
                  >
                    {w} mm
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Mostrar total en Bs.</label>
              <button
                type="button"
                className={styles.toggleWrap}
                onClick={() => set('ticket_show_bs', profile.ticket_show_bs === 'true' ? 'false' : 'true')}
                aria-pressed={profile.ticket_show_bs === 'true'}
              >
                <div className={`${styles.toggle} ${profile.ticket_show_bs === 'true' ? styles.on : ''}`}>
                  <div className={styles.toggleKnob} />
                </div>
                <span className={styles.toggleLabel}>
                  {profile.ticket_show_bs === 'true' ? 'Activado' : 'Desactivado'}
                </span>
              </button>
            </div>
          </div>

        </div>
        <button
          className={styles.btnSave}
          onClick={() => saveSection(['ticket_footer', 'ticket_show_bs', 'ticket_width_mm'])}
          disabled={saving}
        >
          <Save size={14} aria-hidden />
          {saving ? 'Guardando…' : 'Guardar configuración de ticket'}
        </button>
      </section>

      {/* ── 4. Información del evento ── */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionLabel}>
            <Trophy size={13} aria-hidden />
            Evento / Partido activo
          </div>
        </div>
        <div className={styles.card}>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="event-name">
              <Calendar size={12} aria-hidden />
              Nombre del evento o partido
            </label>
            <input
              id="event-name"
              className={styles.input}
              value={profile.event_name}
              onChange={(e) => set('event_name', e.target.value)}
              placeholder="Guaiqueríes vs Caribes · Final"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="event-venue">
              <MapPin size={12} aria-hidden />
              Estadio / Venue
            </label>
            <input
              id="event-venue"
              className={styles.input}
              value={profile.event_venue}
              onChange={(e) => set('event_venue', e.target.value)}
              placeholder="Estadio Fórmula, Margarita"
            />
          </div>

          <p className={styles.sectionHint}>
            Este dato se imprime en el ticket y se muestra en el dashboard. Actualízalo antes de cada partido.
          </p>

        </div>
        <button
          className={styles.btnSave}
          onClick={() => saveSection(['event_name', 'event_venue'])}
          disabled={saving}
        >
          <Save size={14} aria-hidden />
          {saving ? 'Guardando…' : 'Guardar evento'}
        </button>
      </section>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className={styles.toast}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            role="status"
            aria-live="polite"
          >
            <Check size={12} aria-hidden />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
