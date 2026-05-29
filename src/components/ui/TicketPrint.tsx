'use client'

import { Printer } from 'lucide-react'
import styles from './TicketPrint.module.css'

// ── Props ─────────────────────────────────────────────────────────────────────

interface TicketPrintProps {
  orderId: number
  /** Solo se renderiza si la orden está PAID */
  paymentStatus: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TicketPrint({ orderId, paymentStatus }: TicketPrintProps) {
  if (paymentStatus !== 'PAID') return null

  function handlePrint() {
    const win = window.open(
      `/api/orders/${orderId}/ticket`,
      `ticket_${orderId}`,
      'width=420,height=640,menubar=no,toolbar=no,location=no',
    )
    if (!win) return
    // Esperar carga y disparar print automáticamente
    win.addEventListener('load', () => {
      win.focus()
      win.print()
    })
  }

  return (
    <button
      type="button"
      className={styles.btn}
      onClick={handlePrint}
      title="Imprimir ticket"
      aria-label="Imprimir ticket"
    >
      <Printer size={15} aria-hidden />
      Imprimir ticket
    </button>
  )
}
