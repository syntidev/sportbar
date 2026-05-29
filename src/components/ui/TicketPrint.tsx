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

  return (
    <a
      href={`/api/orders/${orderId}/ticket`}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.btn}
      title="Imprimir ticket"
      aria-label="Imprimir ticket"
    >
      <Printer size={15} aria-hidden />
      Imprimir ticket
    </a>
  )
}
