'use client'

import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { Upload, CheckCircle, AlertCircle, XCircle, X } from 'lucide-react'
import type { Category } from '@/types'
import styles from './ImportButton.module.css'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ImportRow {
  name:        string
  description: string | null
  price_usd:   number
  category:    Category
  is_active:   boolean
}

interface RowError {
  row:    number
  input:  unknown
  issues: string[]
}

interface ImportResult {
  imported: number
  skipped:  number
  errors:   RowError[]
}

type Phase = 'idle' | 'reading' | 'uploading' | 'done' | 'error'

// ── Normalization helpers ─────────────────────────────────────────────────────

const VALID_CATEGORIES = new Set<string>(['hamburguesas', 'raciones', 'bebidas'])

function normalizeCategory(raw: unknown): Category | null {
  if (typeof raw !== 'string') return null
  const v = raw.toLowerCase().trim()
  if (VALID_CATEGORIES.has(v)) return v as Category
  if (v === 'hamburguesa')                    return 'hamburguesas'
  if (v === 'racion' || v === 'ración')       return 'raciones'
  if (v === 'bebida')                         return 'bebidas'
  return null
}

function normalizeBoolean(raw: unknown): boolean {
  if (typeof raw === 'boolean') return raw
  if (typeof raw === 'number')  return raw !== 0
  if (typeof raw === 'string') {
    const v = raw.toLowerCase().trim()
    return v === 'si' || v === 'sí' || v === 'true' || v === '1' || v === 'yes'
  }
  return true
}

// ── Sheet parser ──────────────────────────────────────────────────────────────

function parseSheet(
  sheet: XLSX.WorkSheet,
): { rows: ImportRow[]; parseErrors: string[] } {
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null })
  const rows: ImportRow[]      = []
  const parseErrors: string[]  = []

  raw.forEach((record, idx) => {
    const rowNum = idx + 2 // 1-based + header row

    const name = typeof record['Nombre'] === 'string'
      ? record['Nombre'].trim()
      : null

    const catRaw = record['Categoria'] ?? record['Categoría']
    const category = normalizeCategory(catRaw)

    const descRaw = record['Descripción'] ?? record['Descripcion'] ?? null
    const description =
      typeof descRaw === 'string' ? (descRaw.trim() || null) : null

    const priceRaw = record['Precio']
    const price_usd =
      typeof priceRaw === 'number'
        ? priceRaw
        : parseFloat(String(priceRaw ?? ''))

    const is_active = normalizeBoolean(record['Activo'])

    if (!name) {
      parseErrors.push(`Fila ${rowNum}: columna "Nombre" vacía`)
      return
    }
    if (!category) {
      parseErrors.push(`Fila ${rowNum}: categoría inválida "${catRaw}"`)
      return
    }
    if (isNaN(price_usd) || price_usd < 0) {
      parseErrors.push(`Fila ${rowNum}: precio inválido "${priceRaw}"`)
      return
    }

    rows.push({ name, description, price_usd, category, is_active })
  })

  return { rows, parseErrors }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ImportButton() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase]           = useState<Phase>('idle')
  const [progress, setProgress]     = useState(0)
  const [result, setResult]         = useState<ImportResult | null>(null)
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [fatalError, setFatalError] = useState<string | null>(null)

  function reset() {
    setPhase('idle')
    setProgress(0)
    setResult(null)
    setParseErrors([])
    setFatalError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setPhase('reading')
    setProgress(10)
    setResult(null)
    setParseErrors([])
    setFatalError(null)

    try {
      const buffer   = await file.arrayBuffer()
      setProgress(30)
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheet    = workbook.Sheets[workbook.SheetNames[0]]

      const { rows, parseErrors: errs } = parseSheet(sheet)
      setParseErrors(errs)
      setProgress(50)

      if (rows.length === 0) {
        setFatalError('No se encontraron filas válidas en el archivo.')
        setPhase('error')
        return
      }

      setPhase('uploading')
      setProgress(70)

      const res  = await fetch('/api/products/import', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(rows),
      })
      setProgress(95)

      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      setResult({ imported: data.imported, skipped: data.skipped, errors: data.errors ?? [] } as ImportResult)
      setProgress(100)
      setPhase('done')
    } catch (err: unknown) {
      setFatalError(err instanceof Error ? err.message : 'Error inesperado')
      setPhase('error')
    }
  }

  const isLoading = phase === 'reading' || phase === 'uploading'

  return (
    <div className={styles.wrapper}>
      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls"
        aria-hidden
        tabIndex={-1}
        className={styles.hiddenInput}
        onChange={handleFile}
      />

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={isLoading}
        className={styles.trigger}
        aria-label="Importar productos desde Excel"
      >
        <Upload size={15} aria-hidden />
        {isLoading ? 'Importando…' : 'Importar Excel'}
      </button>

      {/* Status panel */}
      {phase !== 'idle' && (
        <div className={styles.panel} role="region" aria-label="Estado de importación">
          {/* Panel header */}
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>
              {phase === 'reading'   && 'Leyendo archivo…'}
              {phase === 'uploading' && 'Importando productos…'}
              {phase === 'done'      && 'Importación completa'}
              {phase === 'error'     && 'Error en la importación'}
            </span>
            {!isLoading && (
              <button
                type="button"
                onClick={reset}
                aria-label="Cerrar"
                className={styles.closeBtn}
              >
                <X size={14} aria-hidden />
              </button>
            )}
          </div>

          {/* Progress bar */}
          {isLoading && (
            <div
              className={styles.progressTrack}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progreso de importación"
            >
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
          )}

          {/* Fatal error */}
          {fatalError && (
            <p className={styles.fatalError}>
              <XCircle size={14} aria-hidden />
              {fatalError}
            </p>
          )}

          {/* Results summary */}
          {result && (
            <ul className={styles.summary}>
              <li className={styles.summaryOk}>
                <CheckCircle size={13} aria-hidden />
                {result.imported} importado{result.imported !== 1 ? 's' : ''}
              </li>
              <li className={styles.summarySkipped}>
                <AlertCircle size={13} aria-hidden />
                {result.skipped} omitido{result.skipped !== 1 ? 's' : ''}
              </li>
            </ul>
          )}

          {/* Per-row parse errors */}
          {parseErrors.length > 0 && (
            <details className={styles.errDetails}>
              <summary className={styles.errSummary}>
                <XCircle size={12} aria-hidden />
                {parseErrors.length} fila{parseErrors.length !== 1 ? 's' : ''} con error de formato
              </summary>
              <ul className={styles.errList}>
                {parseErrors.map((msg, i) => (
                  <li key={i} className={styles.errItem}>{msg}</li>
                ))}
              </ul>
            </details>
          )}

          {/* DB-level errors from API */}
          {(result?.errors?.length ?? 0) > 0 && (
            <details className={styles.errDetails}>
              <summary className={styles.errSummary}>
                <XCircle size={12} aria-hidden />
                {result!.errors.length} fila{result!.errors.length !== 1 ? 's' : ''} rechazada{result!.errors.length !== 1 ? 's' : ''} por validación
              </summary>
              <ul className={styles.errList}>
                {result!.errors.map((err, i) => (
                  <li key={i} className={styles.errItem}>
                    Fila {err.row}: {err.issues.join(', ')}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
