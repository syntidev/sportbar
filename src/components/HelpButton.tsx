'use client'

// src/components/HelpButton.tsx
// Drawer de ayuda contextual — portado de SYNTImeat HelpModal.vue
// Props: title, steps (Cómo funciona), faqs (acordeón)
// Comportamiento: botón ? → drawer slide desde la derecha, Escape cierra

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { HelpCircle, Lightbulb, X } from 'lucide-react'
import styles from './HelpButton.module.css'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HelpStep {
  title: string
  body:  string
  tip?:  string
}

export interface HelpFaq {
  q: string
  a: string
}

interface Props {
  title: string
  steps: HelpStep[]
  faqs:  HelpFaq[]
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function HelpButton({ title, steps, faqs }: Props) {
  const [open,      setOpen]      = useState(false)
  const [activeTab, setActiveTab] = useState<'steps' | 'faqs'>('steps')
  const [openFaq,   setOpenFaq]   = useState<number | null>(null)
  const [mounted,   setMounted]   = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)

  // SSR-safe portal
  useEffect(() => { setMounted(true) }, [])

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setActiveTab('steps')
      setOpenFaq(null)
      setTimeout(() => closeRef.current?.focus(), 60)
    }
  }, [open])

  // Escape cierra
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const hasBoth = steps.length > 0 && faqs.length > 0

  const drawer = (
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            className={styles.panel}
            role="dialog"
            aria-modal
            aria-label={`Ayuda: ${title}`}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={styles.header}>
              <div className={styles.titleRow}>
                <div className={styles.badge} aria-hidden>?</div>
                <h2 className={styles.title}>{title}</h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                className={styles.closeBtn}
                onClick={() => setOpen(false)}
                aria-label="Cerrar ayuda"
              >
                <X size={16} aria-hidden />
              </button>
            </div>

            {/* Tabs */}
            {hasBoth && (
              <div className={styles.tabs} role="tablist">
                <button
                  role="tab"
                  aria-selected={activeTab === 'steps'}
                  className={`${styles.tab} ${activeTab === 'steps' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('steps')}
                >
                  Cómo funciona
                </button>
                <button
                  role="tab"
                  aria-selected={activeTab === 'faqs'}
                  className={`${styles.tab} ${activeTab === 'faqs' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('faqs')}
                >
                  Preguntas frecuentes
                </button>
              </div>
            )}

            {/* Body */}
            <div className={styles.body}>

              {/* Pasos */}
              {(activeTab === 'steps' || !hasBoth) && steps.length > 0 && (
                <div className={styles.stepsList}>
                  {steps.map((step, i) => (
                    <div key={i} className={styles.stepItem}>
                      <div className={styles.stepNum} aria-hidden>{i + 1}</div>
                      <div className={styles.stepContent}>
                        <span className={styles.stepTitle}>{step.title}</span>
                        <p className={styles.stepBody}>{step.body}</p>
                        {step.tip && (
                          <p className={styles.stepTip}>
                            <Lightbulb size={13} className={styles.tipIcon} aria-hidden />
                            {step.tip}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* FAQs acordeón */}
              {(activeTab === 'faqs' || !hasBoth) && faqs.length > 0 && (
                <div className={styles.faqsList}>
                  {faqs.map((faq, i) => (
                    <div key={i} className={styles.faqItem}>
                      <button
                        type="button"
                        className={styles.faqQ}
                        aria-expanded={openFaq === i}
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      >
                        <span className={styles.faqText}>{faq.q}</span>
                        <span className={styles.faqCaret} aria-hidden>
                          {openFaq === i ? '▲' : '▼'}
                        </span>
                      </button>
                      <AnimatePresence>
                        {openFaq === i && (
                          <motion.p
                            className={styles.faqA}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.15 }}
                          >
                            {faq.a}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(true)}
        aria-label={`Abrir ayuda: ${title}`}
        title="Ayuda"
      >
        <HelpCircle size={16} strokeWidth={2.5} aria-hidden />
      </button>

      {mounted && createPortal(drawer, document.body)}
    </>
  )
}
