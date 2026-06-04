'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Delete, Check } from 'lucide-react'
import type { Role } from '@/types'
import styles from './page.module.css'

// ── Role → route map ──────────────────────────────────────────────────────────

const ROLE_ROUTES: Record<Role, string> = {
  admin:     '/admin',
  mesero:    '/pos',
  cocina:    '/kds/cocina',
  bar:       '/kds/bar',
  despacho:  '/kds/despacho',
  validador: '/admin',
}

// ── PIN pad layout ────────────────────────────────────────────────────────────

const PAD = ['1','2','3','4','5','6','7','8','9','DEL','0','OK'] as const
type PadKey = typeof PAD[number]

// ── Component ─────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter()

  const [code, setCode]       = useState('')
  const [pin, setPin]         = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [shaking, setShaking] = useState(false)

  const submittingRef = useRef(false)

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function triggerError(msg: string) {
    setPin('')
    setError(msg)
    setShaking(true)
    setTimeout(() => setShaking(false), 500)
  }

  const submit = useCallback(
    async (pinValue: string, codeValue: string) => {
      if (submittingRef.current || !codeValue.trim() || pinValue.length !== 4) return
      submittingRef.current = true
      setLoading(true)
      setError(null)

      try {
        const res  = await fetch('/api/auth/session', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ code: codeValue.trim().toUpperCase(), pin: pinValue }),
        })
        const data = await res.json()

        if (!data.success) {
          triggerError(data.error ?? 'PIN incorrecto')
          return
        }

        router.replace(ROLE_ROUTES[data.user.role as Role] ?? '/pos')
      } catch {
        triggerError('Error de conexión')
      } finally {
        setLoading(false)
        submittingRef.current = false
      }
    },
    [router],
  )

  // Auto-submit when 4th digit is entered
  useEffect(() => {
    if (pin.length !== 4 || !code.trim()) return
    const t = setTimeout(() => submit(pin, code), 260)
    return () => clearTimeout(t)
  }, [pin]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Key handler ──────────────────────────────────────────────────────────────

  function pressKey(key: PadKey) {
    if (loading) return

    if (key === 'DEL') {
      setPin((p) => p.slice(0, -1))
      setError(null)
      return
    }

    if (key === 'OK') {
      if (pin.length === 4 && code.trim()) submit(pin, code)
      return
    }

    if (pin.length < 4) {
      setPin((p) => p + key)
      setError(null)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <main className={styles.page}>
      <div className={styles.card}>

        {/* Brand */}
        <div className={styles.brand}>
          <span className={styles.brandOrb} aria-hidden />
          <h1 className={styles.brandName}>SportBar</h1>
        </div>

        {/* User code input */}
        <div className={styles.field}>
          <label htmlFor="userCode" className={styles.label}>
            Código de usuario
          </label>
          <input
            id="userCode"
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase())
              setError(null)
            }}
            placeholder="USR-001"
            autoComplete="off"
            spellCheck={false}
            maxLength={10}
            className={styles.codeInput}
            disabled={loading}
          />
        </div>

        {/* PIN dot indicators */}
        <motion.div
          className={styles.dots}
          animate={shaking ? { x: [0, -10, 10, -8, 8, -5, 5, 0] } : { x: 0 }}
          transition={{ duration: 0.45 }}
          role="img"
          aria-label={`PIN: ${pin.length} de 4 dígitos ingresados`}
        >
          {Array.from({ length: 4 }, (_, i) => (
            <motion.span
              key={i}
              className={`${styles.dot} ${i < pin.length ? styles.dotFilled : ''}`}
              animate={
                i < pin.length
                  ? { scale: [1, 1.5, 0.88, 1] }
                  : { scale: 1 }
              }
              transition={{ type: 'spring', stiffness: 520, damping: 18 }}
            />
          ))}
        </motion.div>

        {/* Error message */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              key={error}
              className={styles.errorMsg}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              role="alert"
              aria-live="assertive"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* PIN pad */}
        <div className={styles.pad} role="group" aria-label="Teclado numérico">
          {PAD.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => pressKey(key)}
              disabled={
                loading ||
                (key === 'OK' && (pin.length < 4 || !code.trim()))
              }
              aria-label={
                key === 'DEL' ? 'Borrar dígito' :
                key === 'OK'  ? 'Confirmar PIN' :
                key
              }
              className={[
                styles.key,
                key === 'DEL' ? styles.keyDel : '',
                key === 'OK'  ? styles.keyOk  : '',
              ].filter(Boolean).join(' ')}
            >
              {key === 'DEL'
                ? <Delete size={22} aria-hidden />
                : key === 'OK'
                ? <Check  size={22} aria-hidden />
                : key}
            </button>
          ))}
        </div>

        {/* Loading indicator */}
        {loading && (
          <p className={styles.loadingText} aria-live="polite">
            Verificando…
          </p>
        )}

      </div>
    </main>
  )
}
