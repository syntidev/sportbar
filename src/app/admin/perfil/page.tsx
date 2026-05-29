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
  business_name:           string
  business_subtitle:       string
  business_rif:            string
  business_phone:          string
  business_address:        string
  business_city:           string
  business_logo_url:       string
  ticket_footer:           string
  ticket_show_bs:          string
  ticket_show_description: string
  ticket_show_ref:         string
  ticket_show_address:     string
  ticket_show_phone:       string
  ticket_show_client:      string
  ticket_show_rif:         string
  ticket_show_cashier:     string
  ticket_show_rate:        string
  ticket_show_payment:     string
  ticket_currency_symbol:  string
  ticket_prefix:           string
  ticket_width_mm:         string
  event_name:              string
  event_venue:             string
}

// ── Toggle definitions ────────────────────────────────────────────────────────

const TICKET_TOGGLES: { key: keyof BusinessProfile; label: string; desc: string }[] = [
  { key: 'ticket_show_description', label: 'Descripción del producto',  desc: 'Texto descriptivo debajo del nombre de cada ítem' },
  { key: 'ticket_show_ref',         label: 'Monto en divisas',          desc: 'Subtotales y total en la moneda de referencia configurada' },
  { key: 'ticket_show_bs',          label: 'Monto en Bolívares',        desc: 'Subtotales y total en Bs. según tasa del día' },
  { key: 'ticket_show_rate',        label: 'Tasa BCV del día',          desc: 'Imprime la tasa de cambio usada en el ticket' },
  { key: 'ticket_show_client',      label: 'Datos del cliente',         desc: 'Nombre y cédula del cliente que ordenó' },
  { key: 'ticket_show_cashier',     label: 'Cajero / Mesero',           desc: 'Nombre del mesero que tomó la orden' },
  { key: 'ticket_show_payment',     label: 'Método de pago',            desc: 'Pago Móvil, Zelle, Efectivo, Tarjeta…' },
  { key: 'ticket_show_rif',         label: 'RIF del negocio',           desc: 'RIF fiscal en la cabecera del ticket' },
  { key: 'ticket_show_address',     label: 'Dirección del negocio',     desc: 'Dirección en la cabecera del ticket' },
  { key: 'ticket_show_phone',       label: 'Teléfono del negocio',      desc: 'Teléfono en la cabecera del ticket' },
]

const TICKET_SAVE_KEYS: (keyof BusinessProfile)[] = [
  'ticket_show_description', 'ticket_show_bs', 'ticket_show_ref',
  'ticket_show_address', 'ticket_show_phone', 'ticket_show_client',
  'ticket_show_rif', 'ticket_show_cashier', 'ticket_show_rate',
  'ticket_show_payment', 'ticket_currency_symbol', 'ticket_prefix',
  'ticket_width_mm', 'ticket_footer',
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function PerfilPage() {
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [toast,    setToast]    = useState<string | null>(null)
  const [error,    setError]    = useState<string | null>(null)
  const [profile,  setProfile]  = useState<BusinessProfile>({
    business_name:           'Sport Bar',
    business_subtitle:       'Guaiqueríes de Margarita',
    business_rif:            '',
    business_phone:          '',
    business_address:        '',
    business_city:           'Margarita, Venezuela',
    business_logo_url:       '',
    ticket_footer:           'Gracias por su visita',
    ticket_show_bs:          'true',
    ticket_show_description: 'false',
    ticket_show_ref:         'true',
    ticket_show_address:     'false',
    ticket_show_phone:       'false',
    ticket_show_client:      'true',
    ticket_show_rif:         'false',
    ticket_show_cashier:     'true',
    ticket_show_rate:        'false',
    ticket_show_payment:     'true',
    ticket_currency_symbol:  'REF',
    ticket_prefix:           'LOC',
    ticket_width_mm:         '58',
    event_name:              '',
    event_venue:             '',
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

  function toggleBool(key: keyof BusinessProfile) {
    setProfile((p) => ({ ...p, [key]: p[key] === 'true' ? 'false' : 'true' }))
  }

  const on = (key: keyof BusinessProfile) => profile[key] === 'true'

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
    const url = URL.createObjectURL(file)
    set('business_logo_url', url)
    showToast('Logo cargado localmente — guarda para confirmar')
  }

  // ── Derived preview values ─────────────────────────────────────────────────

  const sym = profile.ticket_currency_symbol || 'REF'
  const pfx = profile.ticket_prefix || 'LOC'

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

        <div className={styles.ticketGrid}>

          {/* ── LEFT: Controls ── */}
          <div className={styles.ticketControls}>

            {/* Toggles */}
            <div className={styles.ticketSubsection}>
              <span className={styles.ticketSubtitle}>Elementos visibles</span>
              <div className={styles.toggleList}>
                {TICKET_TOGGLES.map(({ key, label, desc }) => (
                  <div key={key} className={styles.toggleRow}>
                    <div className={styles.toggleInfo}>
                      <span className={styles.toggleTitle}>{label}</span>
                      <span className={styles.toggleDesc}>{desc}</span>
                    </div>
                    <button
                      type="button"
                      className={styles.switchWrap}
                      onClick={() => toggleBool(key)}
                      aria-pressed={on(key)}
                      aria-label={label}
                    >
                      <div className={`${styles.switch} ${on(key) ? styles.switchOn : ''}`}>
                        <div className={styles.switchKnob} />
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Formato */}
            <div className={styles.ticketSubsection}>
              <span className={styles.ticketSubtitle}>Formato</span>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Símbolo de moneda</label>
                <div className={styles.pillGroup}>
                  {(['REF', '$', 'Bs.'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`${styles.pill} ${profile.ticket_currency_symbol === s ? styles.pillActive : ''}`}
                      onClick={() => set('ticket_currency_symbol', s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label} htmlFor="ticket-prefix">Prefijo del ticket</label>
                  <input
                    id="ticket-prefix"
                    className={styles.input}
                    value={profile.ticket_prefix}
                    onChange={(e) => set('ticket_prefix', e.target.value.toUpperCase().slice(0, 6))}
                    placeholder="LOC"
                    maxLength={6}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Ancho</label>
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
              </div>

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
            </div>

            <button
              className={styles.btnSave}
              onClick={() => saveSection(TICKET_SAVE_KEYS)}
              disabled={saving}
            >
              <Save size={14} aria-hidden />
              {saving ? 'Guardando…' : 'Guardar configuración de ticket'}
            </button>
          </div>

          {/* ── RIGHT: Preview ── */}
          <div className={styles.ticketPreviewWrap}>
            <span className={styles.previewLabel}>Vista previa</span>
            <div className={styles.ticketPreview} aria-label="Vista previa del ticket">

              <div className={styles.pvCenter}>
                <div className={styles.pvBizName}>{profile.business_name || 'Sport Bar'}</div>
                {profile.business_subtitle && (
                  <div className={styles.pvSmall}>{profile.business_subtitle}</div>
                )}
                {on('ticket_show_rif') && profile.business_rif && (
                  <div className={styles.pvSmall}>RIF: {profile.business_rif}</div>
                )}
                {on('ticket_show_address') && profile.business_address && (
                  <div className={styles.pvSmall}>{profile.business_address}</div>
                )}
                {on('ticket_show_phone') && profile.business_phone && (
                  <div className={styles.pvSmall}>Tel: {profile.business_phone}</div>
                )}
              </div>

              <div className={styles.pvSep} />
              <div className={styles.pvCode}>{pfx}-001</div>

              <div className={styles.pvRow}>
                <span className={styles.pvMuted}>Fecha:</span>
                <span>01/06/2025 20:00</span>
              </div>
              {on('ticket_show_client') && (
                <div className={styles.pvRow}>
                  <span className={styles.pvMuted}>Cliente:</span>
                  <span>Juan Pérez CI 7654321</span>
                </div>
              )}
              {on('ticket_show_cashier') && (
                <div className={styles.pvRow}>
                  <span className={styles.pvMuted}>Atendido:</span>
                  <span>María G.</span>
                </div>
              )}
              {on('ticket_show_rate') && (
                <div className={styles.pvRow}>
                  <span className={styles.pvMuted}>Tasa BCV:</span>
                  <span>42.50 Bs./USD</span>
                </div>
              )}

              <div className={styles.pvSep} />

              <div className={styles.pvItemHeader}>
                <span>DESCRIPCIÓN</span>
                {on('ticket_show_ref') && <span>TOTAL</span>}
              </div>

              {/* Item 1 */}
              <div className={styles.pvItemRow}>
                <span className={styles.pvQty}>2x</span>
                <span className={styles.pvItemName}>Hamburguesa Clásica</span>
                {on('ticket_show_ref') && (
                  <span className={styles.pvItemPrice}>{sym} 8.00</span>
                )}
              </div>
              {on('ticket_show_description') && (
                <div className={styles.pvItemDesc}>Con papas y refresco incluido</div>
              )}
              {on('ticket_show_bs') && (
                <div className={styles.pvItemBs}>Bs. 340.00</div>
              )}

              {/* Item 2 */}
              <div className={styles.pvItemRow}>
                <span className={styles.pvQty}>1x</span>
                <span className={styles.pvItemName}>Malta</span>
                {on('ticket_show_ref') && (
                  <span className={styles.pvItemPrice}>{sym} 2.00</span>
                )}
              </div>
              {on('ticket_show_description') && (
                <div className={styles.pvItemDesc}>Fría, 355ml</div>
              )}
              {on('ticket_show_bs') && (
                <div className={styles.pvItemBs}>Bs. 85.00</div>
              )}

              <div className={styles.pvSep} />

              <div className={styles.pvTotal}>
                <span>TOTAL</span>
                {on('ticket_show_ref') && <span>{sym} 10.00</span>}
              </div>
              {on('ticket_show_bs') && (
                <div className={styles.pvRow}>
                  <span className={styles.pvMuted}>En Bolívares:</span>
                  <span>Bs. 425.00</span>
                </div>
              )}

              {on('ticket_show_payment') && (
                <>
                  <div className={styles.pvSep} />
                  <div className={styles.pvCenter}>
                    <span className={styles.pvSmall}>Pago: Pago Móvil</span>
                  </div>
                </>
              )}

              <div className={styles.pvSep} />
              <div className={styles.pvCenter}>
                <span className={styles.pvFooter}>
                  {profile.ticket_footer || 'Gracias por su visita'}
                </span>
              </div>

            </div>
          </div>

        </div>
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
