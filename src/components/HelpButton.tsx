'use client'

// src/components/HelpButton.tsx
// Global help button — renders a ? trigger; on click shows a modal with color/icon/action legend.

import { useState } from 'react'
import { HelpCircle, X } from 'lucide-react'
import styles from './HelpButton.module.css'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HelpColor {
  color: string
  label: string
}

export interface HelpIconDef {
  icon:  string
  label: string
}

export interface HelpAction {
  action:      string
  description: string
}

export interface HelpContent {
  colors?:  HelpColor[]
  icons?:   HelpIconDef[]
  actions?: HelpAction[]
}

interface Props {
  module:  string
  title:   string
  content: HelpContent
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function HelpButton({ module, title, content }: Props) {
  const [open, setOpen] = useState(false)

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) setOpen(false)
  }

  const hasColors  = (content.colors  ?? []).length > 0
  const hasIcons   = (content.icons   ?? []).length > 0
  const hasActions = (content.actions ?? []).length > 0

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(true)}
        aria-label={`Ayuda — ${module}`}
        title={`Ayuda: ${title}`}
      >
        <HelpCircle size={16} strokeWidth={2.5} aria-hidden />
      </button>

      {open && (
        <div
          className={styles.backdrop}
          role="dialog"
          aria-modal
          aria-label={title}
          onClick={handleBackdropClick}
        >
          <div className={styles.modal}>

            {/* Header */}
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>{title}</span>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setOpen(false)}
                aria-label="Cerrar ayuda"
              >
                <X size={16} aria-hidden />
              </button>
            </div>

            {/* Body */}
            <div className={styles.modalBody}>

              {hasColors && (
                <section className={styles.section}>
                  <h3 className={styles.sectionTitle}>Colores</h3>
                  <ul className={styles.list}>
                    {content.colors!.map((c) => (
                      <li key={c.label} className={styles.colorRow}>
                        <span
                          className={styles.colorDot}
                          style={{ background: c.color }}
                          aria-hidden
                        />
                        <span className={styles.itemLabel}>{c.label}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {hasIcons && (
                <section className={styles.section}>
                  <h3 className={styles.sectionTitle}>Íconos</h3>
                  <ul className={styles.list}>
                    {content.icons!.map((ic) => (
                      <li key={ic.label} className={styles.iconRow}>
                        <span className={styles.iconGlyph}>{ic.icon}</span>
                        <span className={styles.itemLabel}>{ic.label}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {hasActions && (
                <section className={styles.section}>
                  <h3 className={styles.sectionTitle}>Acciones</h3>
                  <ul className={styles.list}>
                    {content.actions!.map((a) => (
                      <li key={a.action} className={styles.actionRow}>
                        <span className={styles.actionName}>{a.action}</span>
                        <span className={styles.actionDesc}>{a.description}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  )
}
