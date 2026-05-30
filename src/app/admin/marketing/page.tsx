"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Download, Image as ImageIcon, QrCode, RefreshCw,
  Trash2, Upload, X, ZoomIn,
} from "lucide-react"
import styles from "./page.module.css"

// ── Types ─────────────────────────────────────────────────────────────

interface SlotState {
  url:      string | null
  loading:  boolean
  dragOver: boolean
}

const ZONAS = ["general", "Norte", "Sur", "VIP", "Externa"] as const
type Zona = typeof ZONAS[number]

// ── Component ─────────────────────────────────────────────────────────

export default function MarketingPage() {
  const [slots, setSlots] = useState<SlotState[]>(
    Array.from({ length: 5 }, () => ({ url: null, loading: false, dragOver: false })),
  )
  const [saving, setSaving]   = useState<number | null>(null)
  const [toast, setToast]     = useState<{ msg: string; type: "ok" | "err" } | null>(null)
  const [zona, setZona]       = useState<Zona>("general")
  const [qrKey, setQrKey]     = useState(0)
  const [preview, setPreview] = useState<string | null>(null)
  const fileRefs = useRef<(HTMLInputElement | null)[]>([])

  // Load existing slots
  useEffect(() => {
    fetch("/api/config/hero-slots")
      .then(r => r.json())
      .then((d: { success: boolean; slots: { slot: number; url: string | null }[] }) => {
        if (!d.success) return
        setSlots(prev =>
          prev.map((s, i) => ({ ...s, url: d.slots[i]?.url ?? null })),
        )
      })
      .catch(() => {})
  }, [])

  function showToast(msg: string, type: "ok" | "err") {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Upload handler
  const uploadSlot = useCallback(async (idx: number, file: File) => {
    if (!file.type.startsWith("image/")) { showToast("Solo imágenes", "err"); return }
    const slot = idx + 1
    setSaving(idx)
    setSlots(prev => prev.map((s, i) => i === idx ? { ...s, loading: true } : s))

    try {
      const fd = new FormData()
      fd.append("image", file)
      const res  = await fetch(`/api/config/hero-slot/${slot}`, { method: "POST", body: fd })
      const data = await res.json() as { success: boolean; url?: string; error?: string }
      if (data.success && data.url) {
        setSlots(prev => prev.map((s, i) => i === idx ? { ...s, url: data.url + "&r=" + Date.now(), loading: false } : s))
        showToast(`Slot ${slot} guardado`, "ok")
      } else {
        showToast(data.error ?? "Error", "err")
        setSlots(prev => prev.map((s, i) => i === idx ? { ...s, loading: false } : s))
      }
    } catch {
      showToast("Error de red", "err")
      setSlots(prev => prev.map((s, i) => i === idx ? { ...s, loading: false } : s))
    } finally {
      setSaving(null)
    }
  }, [])

  // Delete handler
  async function deleteSlot(idx: number) {
    const slot = idx + 1
    setSlots(prev => prev.map((s, i) => i === idx ? { ...s, loading: true } : s))
    try {
      const res  = await fetch(`/api/config/hero-slot/${slot}`, { method: "DELETE" })
      const data = await res.json() as { success: boolean }
      if (data.success) {
        setSlots(prev => prev.map((s, i) => i === idx ? { ...s, url: null, loading: false } : s))
        showToast(`Slot ${slot} eliminado`, "ok")
      } else {
        setSlots(prev => prev.map((s, i) => i === idx ? { ...s, loading: false } : s))
      }
    } catch {
      setSlots(prev => prev.map((s, i) => i === idx ? { ...s, loading: false } : s))
    }
  }

  // Drag and drop
  function onDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    setSlots(prev => prev.map((s, i) => i === idx ? { ...s, dragOver: true } : s))
  }
  function onDragLeave(idx: number) {
    setSlots(prev => prev.map((s, i) => i === idx ? { ...s, dragOver: false } : s))
  }
  function onDrop(e: React.DragEvent, idx: number) {
    e.preventDefault()
    setSlots(prev => prev.map((s, i) => i === idx ? { ...s, dragOver: false } : s))
    const file = e.dataTransfer.files[0]
    if (file) void uploadSlot(idx, file)
  }

  const qrSvgUrl    = `/api/qr/generate?zona=${encodeURIComponent(zona)}&k=${qrKey}`
  const qrPngUrl    = `/api/qr/download?zona=${encodeURIComponent(zona)}`

  return (
    <div className={styles.page}>
      {/* Toast */}
      {toast && (
        <div className={`${styles.toast} ${toast.type === "ok" ? styles.toastOk : styles.toastErr}`}>
          {toast.msg}
        </div>
      )}

      {/* Image lightbox */}
      {preview && (
        <div className={styles.lightbox} onClick={() => setPreview(null)}>
          <button className={styles.lightboxClose} onClick={() => setPreview(null)}><X size={22} /></button>
          <img src={preview} className={styles.lightboxImg} alt="preview" onClick={e => e.stopPropagation()} />
        </div>
      )}

      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>Marketing</h1>
        <p className={styles.pageSub}>Hero slider publicitario y código QR de acceso</p>
      </div>

      {/* ── HERO SLIDER SECTION ───────────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <ImageIcon size={18} className={styles.sectionIcon} />
          <div>
            <h2 className={styles.sectionTitle}>Hero Slider</h2>
            <p className={styles.sectionSub}>Hasta 5 imágenes • Se muestran encima del menú público • Autoplay 4s</p>
          </div>
        </div>

        <div className={styles.slotsGrid}>
          {slots.map((slot, idx) => (
            <div
              key={idx}
              className={`${styles.slot} ${slot.dragOver ? styles.slotOver : ""} ${slot.loading ? styles.slotLoading : ""}`}
              onDragOver={e => onDragOver(e, idx)}
              onDragLeave={() => onDragLeave(idx)}
              onDrop={e => onDrop(e, idx)}
              onClick={() => !slot.url && fileRefs.current[idx]?.click()}
            >
              <span className={styles.slotN}>{idx + 1}</span>

              {slot.loading ? (
                <div className={styles.slotSpinner}><RefreshCw size={24} className={styles.spin} /></div>
              ) : slot.url ? (
                <>
                  <img src={slot.url} alt={`Slot ${idx + 1}`} className={styles.slotImg} />
                  <div className={styles.slotOverlay}>
                    <button
                      className={styles.slotAction}
                      onClick={e => { e.stopPropagation(); setPreview(slot.url!) }}
                      title="Ver"
                    >
                      <ZoomIn size={16} />
                    </button>
                    <button
                      className={styles.slotAction}
                      onClick={e => { e.stopPropagation(); fileRefs.current[idx]?.click() }}
                      title="Reemplazar"
                    >
                      <Upload size={16} />
                    </button>
                    <button
                      className={`${styles.slotAction} ${styles.slotDelete}`}
                      onClick={e => { e.stopPropagation(); void deleteSlot(idx) }}
                      title="Eliminar"
                      disabled={saving === idx}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </>
              ) : (
                <div className={styles.slotEmpty}>
                  <Upload size={28} className={styles.slotEmptyIcon} />
                  <span className={styles.slotEmptyLabel}>Arrastra o click</span>
                  <span className={styles.slotEmptyHint}>JPG · PNG · WebP · máx 5MB</span>
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                ref={el => { fileRefs.current[idx] = el }}
                className={styles.fileInput}
                onChange={e => { const f = e.target.files?.[0]; if (f) void uploadSlot(idx, f); e.target.value = "" }}
              />
            </div>
          ))}
        </div>
        <p className={styles.slotHint}>
          Arte recomendado: <strong>1440 × 400 px</strong> — La primera imagen es la principal. El slider avanza automáticamente cada 4 segundos.
        </p>
      </section>

      {/* ── QR SECTION ───────────────────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <QrCode size={18} className={styles.sectionIcon} />
          <div>
            <h2 className={styles.sectionTitle}>Código QR de Acceso</h2>
            <p className={styles.sectionSub}>Apunta a la carta pública con tracking de escaneos</p>
          </div>
        </div>

        <div className={styles.qrLayout}>
          {/* Zona selector */}
          <div className={styles.qrControls}>
            <label className={styles.qrLabel}>Zona destino</label>
            <div className={styles.zonaGrid}>
              {ZONAS.map(z => (
                <button
                  key={z}
                  className={`${styles.zonaBtn} ${zona === z ? styles.zonaBtnActive : ""}`}
                  onClick={() => { setZona(z); setQrKey(k => k + 1) }}
                >
                  {z === "general" ? "General" : z}
                </button>
              ))}
            </div>
            <p className={styles.qrUrlPreview}>
              tusport.bar/menu?ref=qr&amp;zona={zona}
            </p>
          </div>

          {/* QR preview */}
          <div className={styles.qrPreview}>
            <div className={styles.qrFrame}>
              <img
                src={qrSvgUrl}
                alt="QR Code"
                className={styles.qrImg}
                key={qrKey}
              />
            </div>
            <div className={styles.qrActions}>
              <a
                href={qrPngUrl}
                download
                className={styles.btnDownload}
              >
                <Download size={16} />
                Descargar PNG
              </a>
              <button
                className={styles.btnRefresh}
                onClick={() => setQrKey(k => k + 1)}
                title="Regenerar"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
