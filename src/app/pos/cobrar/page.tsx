'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  Banknote,
  Camera,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  RefreshCw,
  X,
  XCircle,
} from 'lucide-react'
import type { PaymentStatus, Zone } from '@/types'
import { TicketPrint } from '@/components/ui/TicketPrint'
import styles from './page.module.css'

// ── Types ─────────────────────────────────────────────────────────────────────

interface SessionUser {
  id: number
  code: string
  role: string
}

interface PayOrder {
  id:               number
  code:             string
  origin:           'PUB' | 'LOC'
  payment_status:   PaymentStatus
  customer_name:    string
  customer_lastname: string
  customer_id:      string | null
  zone:             Zone
  seat:             string | null
  total_usd:        number
  total_bs:         number
  created_at:       string
  user:             { code: string; name: string } | null
}

type ModalMode = 'cobrar' | 'fiar' | 'anular'

// ── Constants ─────────────────────────────────────────────────────────────────

const POLL_MS = 15_000

const PAYMENT_METHODS = [
  'Pago Móvil',
  'Efectivo',
  'Zelle',
  'Tarjeta',
  'Binance',
  'USDT',
] as const

const STATUS_COLOR: Record<string, string> = {
  PEND:   'var(--color-pendiente)',
  CREDIT: 'var(--color-credito)',
}

const STATUS_LABEL: Record<string, string> = {
  PEND:   'Pendiente',
  CREDIT: 'Fiado',
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function fetchPendingOrders(): Promise<PayOrder[]> {
  const res = await fetch('/api/orders?payment=pending&limit=200', { cache: 'no-store' })
  const data: { success: boolean; orders?: PayOrder[]; error?: string } = await res.json()
  if (!data.success) throw new Error(data.error ?? 'Error al cargar órdenes')
  return (data.orders ?? []).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
}

async function fetchMe(): Promise<SessionUser | null> {
  try {
    const res = await fetch('/api/auth/me', { cache: 'no-store' })
    const data: { success: boolean; user?: SessionUser } = await res.json()
    return data.success ? (data.user ?? null) : null
  } catch {
    return null
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CobrarPage() {
  const [orders,     setOrders]     = useState<PayOrder[]>([])
  const [loading,    setLoading]    = useState(true)
  const [listError,  setListError]  = useState<string | null>(null)
  const [lastSync,   setLastSync]   = useState<Date | null>(null)
  const [me,         setMe]         = useState<SessionUser | null>(null)

  // modal
  const [selected,   setSelected]   = useState<PayOrder | null>(null)
  const [mode,       setMode]       = useState<ModalMode>('cobrar')
  const [method,     setMethod]     = useState('')
  const [refCode,    setRefCode]    = useState('')
  const [note,       setNote]       = useState('')
  const [photoName,  setPhotoName]  = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [success,    setSuccess]    = useState<string | null>(null)

  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const photoRef = useRef<HTMLInputElement>(null)

  const poll = useCallback(async () => {
    try {
      const data = await fetchPendingOrders()
      setOrders(data)
      setListError(null)
      setLastSync(new Date())
    } catch (e: unknown) {
      setListError(e instanceof Error ? e.message : 'Error de red')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    poll()
    void fetchMe().then(setMe)
    pollRef.current = setInterval(poll, POLL_MS)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [poll])

  function openModal(order: PayOrder, m: ModalMode) {
    setSelected(order)
    setMode(m)
    setMethod('')
    setRefCode('')
    setNote('')
    setPhotoName(null)
    setModalError(null)
    setSuccess(null)
  }

  function closeModal() {
    if (submitting) return
    setSelected(null)
  }

  async function handleConfirm() {
    if (!selected || !me) return

    setModalError(null)
    setSubmitting(true)

    try {
      const payload: Record<string, unknown> = { actor_code: me.code }

      if (mode === 'cobrar') {
        payload.payment_status = 'PAID'
        payload.payment_method = method
        if (refCode.trim()) payload.ref_code = refCode.trim()
        if (photoName)       payload.receipt_photo = photoName
      } else if (mode === 'fiar') {
        payload.payment_status = 'CREDIT'
        payload.note = note.trim()
      } else {
        payload.payment_status = 'CANCELLED'
        payload.note = note.trim()
      }

      const res = await fetch(`/api/orders/${selected.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data: { success: boolean; errors?: string[]; error?: string } = await res.json()
      if (!data.success) throw new Error(data.errors?.[0] ?? data.error ?? 'Error al actualizar')

      setSuccess(
        mode === 'cobrar' ? 'Pago registrado' :
        mode === 'fiar'   ? 'Crédito registrado' :
                            'Orden anulada',
      )
      await poll()
      setTimeout(closeModal, 1100)
    } catch (e: unknown) {
      setModalError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSubmitting(false)
    }
  }

  const canAnular = me?.role === 'admin'

  const confirmDisabled =
    submitting ||
    (mode === 'cobrar' && !method) ||
    (mode === 'fiar'   && note.trim().length === 0) ||
    (mode === 'anular' && note.trim().length < 10)

  return (
    <div className={styles.page}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className={styles.header}>
        <Link href="/pos" className={styles.backBtn} aria-label="Volver al POS">
          <ArrowLeft size={18} />
        </Link>
        <div className={styles.headerInfo}>
          <span className={styles.headerTitle}>Cobrar</span>
          <span className={styles.headerSub}>Gestión de pagos · REF · Bs.</span>
        </div>
        <div className={styles.headerRight}>
          {lastSync && (
            <span className={styles.syncLabel}>
              <RefreshCw size={10} aria-hidden />
              {lastSync.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {orders.length > 0 && (
            <span className={styles.countPill}>{orders.length}</span>
          )}
        </div>
      </header>

      {/* ── Error banner ────────────────────────────────────────────────────── */}
      {listError && (
        <div className={styles.errorBanner} role="alert">{listError}</div>
      )}

      {/* ── Loading ─────────────────────────────────────────────────────────── */}
      {loading && (
        <div className={styles.splash}>
          <span className={styles.spinner} aria-hidden />
          <span className={styles.splashText}>Cargando órdenes…</span>
        </div>
      )}

      {/* ── Empty ───────────────────────────────────────────────────────────── */}
      {!loading && !listError && orders.length === 0 && (
        <div className={styles.splash}>
          <CheckCircle2 size={48} strokeWidth={1} className={styles.emptyIcon} aria-hidden />
          <span className={styles.splashText}>Sin cobros pendientes</span>
        </div>
      )}

      {/* ── Order list ──────────────────────────────────────────────────────── */}
      {!loading && orders.length > 0 && (
        <main className={styles.list} role="list">
          <AnimatePresence initial={false}>
            {orders.map((order) => (
              <motion.article
                key={order.id}
                role="listitem"
                className={styles.card}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.18 }}
              >
                <div className={styles.cardTop}>
                  <div className={styles.cardLeft}>
                    <span className={`${styles.orderCode} ${order.origin === 'LOC' ? styles.codeLoc : styles.codePub}`}>
                      {order.code}
                    </span>
                    <span
                      className={styles.statusBadge}
                      style={{ color: STATUS_COLOR[order.payment_status] }}
                    >
                      {STATUS_LABEL[order.payment_status]}
                    </span>
                  </div>
                  <div className={styles.cardRight}>
                    <span className={styles.totalRef}>REF {Number(order.total_usd).toFixed(2)}</span>
                    <span className={styles.totalBs}>
                      Bs. {Number(order.total_bs).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className={styles.cardMid}>
                  <span className={styles.customerName}>
                    {order.customer_name} {order.customer_lastname}
                    {order.customer_id ? ` · CI ${order.customer_id}` : ''}
                  </span>
                  <span className={styles.locationLine}>
                    {order.zone}{order.seat ? ` · Asiento ${order.seat}` : ''}
                  </span>
                </div>

                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnCobrar}`}
                    onClick={() => openModal(order, 'cobrar')}
                  >
                    <Banknote size={15} aria-hidden />
                    Cobrar
                  </button>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnFiar}`}
                    onClick={() => openModal(order, 'fiar')}
                  >
                    <CreditCard size={15} aria-hidden />
                    Fiar
                  </button>
                  {canAnular && (
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnAnular}`}
                      onClick={() => openModal(order, 'anular')}
                      aria-label={`Anular orden ${order.code}`}
                    >
                      <XCircle size={15} aria-hidden />
                      Anular
                    </button>
                  )}
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </main>
      )}

      {/* ── Modal ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              className={styles.backdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              aria-hidden
            />
            <motion.div
              className={styles.modal}
              role="dialog"
              aria-modal="true"
              aria-label={
                mode === 'cobrar' ? 'Registrar pago' :
                mode === 'fiar'   ? 'Registrar crédito' :
                                    'Anular orden'
              }
              initial={{ opacity: 0, y: 48 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 48 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            >
              {/* ── Modal header ── */}
              <div className={styles.modalHeader}>
                <div>
                  <h2 className={styles.modalTitle}>
                    {mode === 'cobrar' ? 'Registrar Pago' :
                     mode === 'fiar'   ? 'Registrar Crédito' :
                                        'Anular Orden'}
                  </h2>
                  <span className={styles.modalSub}>{selected.code}</span>
                </div>
                <button type="button" className={styles.closeBtn} onClick={closeModal} aria-label="Cerrar">
                  <X size={18} />
                </button>
              </div>

              {/* ── Order summary ── */}
              <div className={styles.modalSummary}>
                <span className={styles.summaryCustomer}>
                  {selected.customer_name} {selected.customer_lastname}
                  {selected.customer_id ? ` · CI ${selected.customer_id}` : ''}
                </span>
                <span className={styles.summaryLocation}>
                  {selected.zone}{selected.seat ? ` · Asiento ${selected.seat}` : ''}
                </span>
                <div className={styles.summaryTotal}>
                  <span className={styles.summaryRef}>REF {Number(selected.total_usd).toFixed(2)}</span>
                  <span className={styles.summaryBs}>
                    Bs. {Number(selected.total_bs).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* ── Modal body ── */}
              <div className={styles.modalBody}>

                {/* COBRAR */}
                {mode === 'cobrar' && (
                  <>
                    <p className={styles.fieldLabel}>
                      Método de pago <span className={styles.req}>*</span>
                    </p>
                    <div className={styles.methodGrid}>
                      {PAYMENT_METHODS.map((m) => (
                        <button
                          key={m}
                          type="button"
                          className={`${styles.methodBtn} ${method === m ? styles.methodSelected : ''}`}
                          onClick={() => setMethod(m)}
                        >
                          {m}
                        </button>
                      ))}
                    </div>

                    <p className={styles.fieldLabel}>Referencia / Confirmación</p>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Nro. de referencia o confirmación"
                      value={refCode}
                      onChange={(e) => setRefCode(e.target.value)}
                      autoComplete="off"
                      inputMode="text"
                    />

                    <p className={styles.fieldLabel}>Foto del comprobante</p>
                    <input
                      ref={photoRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null
                        setPhotoName(f ? f.name : null)
                      }}
                    />
                    <button
                      type="button"
                      className={`${styles.photoBtn} ${photoName ? styles.photoBtnDone : ''}`}
                      onClick={() => photoRef.current?.click()}
                    >
                      <Camera size={16} aria-hidden />
                      {photoName ?? 'Capturar comprobante'}
                    </button>
                  </>
                )}

                {/* FIAR */}
                {mode === 'fiar' && (
                  <>
                    <p className={styles.fieldLabel}>
                      Nota de crédito <span className={styles.req}>*</span>
                    </p>
                    <textarea
                      className={`${styles.input} ${styles.textarea}`}
                      placeholder="Nombre del fiado, acuerdo de pago, fecha estimada…"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                    />
                  </>
                )}

                {/* ANULAR */}
                {mode === 'anular' && (
                  <>
                    <p className={styles.fieldLabel}>
                      Motivo de anulación <span className={styles.req}>*</span>
                      <span className={styles.minChars}> (mín. 10 caracteres)</span>
                    </p>
                    <textarea
                      className={`${styles.input} ${styles.textarea}`}
                      placeholder="Describe el motivo de anulación…"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                    />
                    {note.length > 0 && note.length < 10 && (
                      <p className={styles.validationHint}>
                        Faltan {10 - note.length} {10 - note.length === 1 ? 'carácter' : 'caracteres'}
                      </p>
                    )}
                  </>
                )}

                {modalError && (
                  <p className={styles.errorMsg} role="alert">{modalError}</p>
                )}

                {success && (
                  <motion.div
                    className={styles.successBlock}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <p className={styles.successMsg}>
                      <CheckCircle2 size={14} aria-hidden />
                      {success}
                    </p>
                    {mode === 'cobrar' && selected && (
                      <TicketPrint orderId={selected.id} paymentStatus="PAID" />
                    )}
                  </motion.div>
                )}
              </div>

              {/* ── Modal footer ── */}
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className={`${styles.confirmBtn} ${
                    mode === 'anular' ? styles.confirmAnular :
                    mode === 'fiar'   ? styles.confirmFiar   : ''
                  }`}
                  onClick={handleConfirm}
                  disabled={confirmDisabled}
                >
                  {submitting
                    ? <span className={styles.spinnerSm} aria-hidden />
                    : <ChevronRight size={16} aria-hidden />
                  }
                  {mode === 'cobrar' ? 'Confirmar Pago' :
                   mode === 'fiar'   ? 'Confirmar Crédito' :
                                       'Anular Orden'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
