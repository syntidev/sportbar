'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { Download, Share2 } from 'lucide-react'
import styles from './page.module.css'

interface TicketItem {
  name:      string
  category:  string
  qty:       number
  price_usd: number
  subtotal:  number
}

interface TicketOrder {
  code:           string
  origin:         string
  customer_name:  string
  zone:           string
  seat:           string | null
  total_usd:      number
  total_bs:       number
  rate_used:      number
  payment_status: string
  kitchen_status: string
  payment_method: string | null
  created_at:     string
  items:          TicketItem[]
}

type LoadState = 'loading' | 'found' | 'not_found' | 'error'

export default function PedidoPage() {
  const { code }                       = useParams<{ code: string }>()
  const [loadState, setLoadState]      = useState<LoadState>('loading')
  const [order, setOrder]              = useState<TicketOrder | null>(null)
  const [businessName, setBusinessName] = useState('Sport Bar')
  const [toast, setToast]              = useState('')
  const [saving, setSaving]            = useState(false)
  const cardRef                        = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!code) return
    fetch(`/api/orders/by-code/${encodeURIComponent(code.toUpperCase())}`)
      .then((r) => r.json())
      .then((data: { success: boolean; order?: TicketOrder; businessName?: string }) => {
        if (data.success && data.order) {
          setOrder(data.order)
          setBusinessName(data.businessName ?? 'Sport Bar')
          setLoadState('found')
        } else {
          setLoadState('not_found')
        }
      })
      .catch(() => setLoadState('error'))
  }, [code])

  function formatTime(iso: string) {
    return new Date(iso).toLocaleString('es-VE', { hour12: false, dateStyle: 'short', timeStyle: 'short' })
  }

  async function handleSave() {
    if (!order || saving) return
    setSaving(true)
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'mm', format: [80, 180], orientation: 'portrait' })
      const W = 80
      let y = 8

      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(businessName.toUpperCase(), W / 2, y, { align: 'center' })
      y += 6

      doc.setFontSize(14)
      doc.text(order.code, W / 2, y, { align: 'center' })
      y += 5

      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.text(formatTime(order.created_at), W / 2, y, { align: 'center' })
      y += 5

      doc.setLineWidth(0.2)
      doc.line(5, y, W - 5, y); y += 4

      doc.setFontSize(8)
      doc.text(`Cliente: ${order.customer_name}`, 5, y); y += 4
      doc.text(`Zona: ${order.zone}${order.seat ? ` · ${order.seat}` : ''}`, 5, y); y += 5

      doc.line(5, y, W - 5, y); y += 4

      for (const item of order.items) {
        doc.setFont('helvetica', 'bold')
        doc.text(`${item.qty}x ${item.name}`, 5, y)
        doc.setFont('helvetica', 'normal')
        doc.text(`REF ${item.subtotal.toFixed(2)}`, W - 5, y, { align: 'right' })
        y += 4
      }

      doc.line(5, y, W - 5, y); y += 4

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.text('TOTAL', 5, y)
      doc.text(`REF ${order.total_usd.toFixed(2)}`, W - 5, y, { align: 'right' })
      y += 4

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.text(`Bs. ${order.total_bs.toFixed(2)} · Tasa ${order.rate_used.toFixed(2)}`, W / 2, y, { align: 'center' })

      doc.save(`ticket-${order.code}.pdf`)
    } catch {
      setToast('Error al generar PDF')
      setTimeout(() => setToast(''), 3000)
    } finally {
      setSaving(false)
    }
  }

  async function handleShare() {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: `Ticket ${order?.code ?? code}`, url })
      } else {
        await navigator.clipboard.writeText(url)
        setToast('Enlace copiado')
        setTimeout(() => setToast(''), 2500)
      }
    } catch { /* user cancelled */ }
  }

  return (
    <div className={styles.wrap}>
      {loadState === 'loading' && (
        <div className={styles.loading}>Cargando ticket…</div>
      )}

      {(loadState === 'not_found' || loadState === 'error') && (
        <div className={styles.notFound}>
          <div className={styles.notFoundCode}>404</div>
          <div className={styles.notFoundMsg}>Código no encontrado</div>
          <div className={styles.notFoundSub}>{code?.toUpperCase()}</div>
        </div>
      )}

      {loadState === 'found' && order && (
        <div className={styles.card} ref={cardRef}>

          <div className={styles.cardTop}>
            <div className={styles.bizName}>{businessName}</div>
            <div className={styles.orderCode}>{order.code}</div>
            <div className={styles.orderMeta}>{formatTime(order.created_at)}</div>
            <div className={styles.badges}>
              <span className={`${styles.badge} ${styles[order.payment_status]}`}>
                {order.payment_status}
              </span>
              <span className={`${styles.badge} ${styles[order.kitchen_status]}`}>
                {order.kitchen_status}
              </span>
            </div>
          </div>

          <div className={styles.cardBody}>
            <div className={styles.customer}>
              <span className={styles.customerLabel}>Cliente · </span>
              {order.customer_name}
            </div>
            <div className={styles.zone}>
              Zona {order.zone}{order.seat ? ` · ${order.seat}` : ''}
            </div>

            <hr className={styles.divider} />

            {order.items.map((item, i) => (
              <div key={i} className={styles.itemRow}>
                <span className={styles.itemName}>{item.name}</span>
                <span className={styles.itemQty}>×{item.qty}</span>
                <span className={styles.itemPrice}>REF {item.subtotal.toFixed(2)}</span>
              </div>
            ))}

            <hr className={styles.divider} />

            <div className={styles.totals}>
              <div className={`${styles.totalRow} ${styles.main}`}>
                <span className={styles.totalLabel}>Total</span>
                <span className={styles.totalValue}>REF {order.total_usd.toFixed(2)}</span>
              </div>
              <div className={styles.totalRow}>
                <span className={styles.totalLabel}>En bolívares</span>
                <span className={styles.totalValue}>Bs. {order.total_bs.toFixed(2)}</span>
              </div>
            </div>
            <div className={styles.rate}>Tasa {order.rate_used.toFixed(2)} Bs./REF</div>
          </div>

          <div className={styles.actions}>
            <button className={`${styles.actionBtn} ${styles.btnSave}`} onClick={() => void handleSave()} disabled={saving}>
              <Download size={14} />
              {saving ? 'Generando…' : 'Guardar recibo'}
            </button>
            <button className={`${styles.actionBtn} ${styles.btnShare}`} onClick={() => void handleShare()}>
              <Share2 size={14} />
              Compartir
            </button>
          </div>

          {toast && <div className={styles.toast}>{toast}</div>}
        </div>
      )}
    </div>
  )
}
