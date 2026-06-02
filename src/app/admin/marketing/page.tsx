"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Download, FileImage, Flame, ImageIcon, Layers, Minus, QrCode,
  RefreshCw, Save, Snowflake, Trash2, Upload, X, ZoomIn,
} from "lucide-react"
import styles from "./page.module.css"

// ── Types ─────────────────────────────────────────────────────────────

type SlotEffectType = 'hot' | 'cold' | 'none'

interface SlotState {
  url:      string | null
  type:     SlotEffectType
  loading:  boolean
  dragOver: boolean
}

const ZONAS = ["general", "Norte", "Sur", "VIP", "Externa"] as const
type Zona = typeof ZONAS[number]

const COLOR_PALETTE: { label: string; value: string }[] = [
  { label: "Naranja",  value: "#F5A623" },   // SportBar brand — default
  { label: "Negro",    value: "#0a0a0a" },
  { label: "Verde",    value: "#2E7D32" },
  { label: "Rojo",     value: "#C62828" },
  { label: "Azul",     value: "#1565C0" },
  { label: "Blanco",   value: "#FFFFFF" },
]

// ── Canvas helpers ─────────────────────────────────────────────────────

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  radii: [number, number, number, number],
) {
  ctx.beginPath()
  ctx.moveTo(x + radii[0], y)
  ctx.arcTo(x + w, y,     x + w, y + h, radii[1])
  ctx.arcTo(x + w, y + h, x,     y + h, radii[2])
  ctx.arcTo(x,     y + h, x,     y,     radii[3])
  ctx.arcTo(x,     y,     x + w, y,     radii[0])
  ctx.closePath()
}

function drawCorners(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number,
  cLen: number, lw: number, color: string,
) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth   = lw
  ctx.lineCap     = "square"
  ctx.lineJoin    = "miter"
  const c = cLen
  // TL
  ctx.beginPath(); ctx.moveTo(x + c, y);         ctx.lineTo(x, y);         ctx.lineTo(x, y + c);           ctx.stroke()
  // TR
  ctx.beginPath(); ctx.moveTo(x + size - c, y);  ctx.lineTo(x + size, y);  ctx.lineTo(x + size, y + c);    ctx.stroke()
  // BR
  ctx.beginPath(); ctx.moveTo(x + size, y + size - c); ctx.lineTo(x + size, y + size); ctx.lineTo(x + size - c, y + size); ctx.stroke()
  // BL
  ctx.beginPath(); ctx.moveTo(x + c, y + size);  ctx.lineTo(x, y + size);  ctx.lineTo(x, y + size - c);    ctx.stroke()
  ctx.restore()
}

// ── Component ─────────────────────────────────────────────────────────

export default function MarketingPage() {
  // Hero slider state
  const [slots, setSlots] = useState<SlotState[]>(
    Array.from({ length: 5 }, () => ({ url: null, type: 'none' as SlotEffectType, loading: false, dragOver: false })),
  )
  const [saving,  setSaving]  = useState<number | null>(null)
  const [toast,   setToast]   = useState<{ msg: string; type: "ok" | "err" } | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const fileRefs = useRef<(HTMLInputElement | null)[]>([])

  // ── Portada (Splash Screen) state ───────────────────────────────────
  const [splashProductImage,  setSplashProductImage]  = useState<string | null>(null)
  const [splashProductImage2, setSplashProductImage2] = useState<string | null>(null)
  const [splashProductName,   setSplashProductName]   = useState<string>("")
  const [splashSubtitle,      setSplashSubtitle]      = useState<string>("")
  const [splashDuration,      setSplashDuration]      = useState<number>(4)
  const [splashForceReload,   setSplashForceReload]   = useState<boolean>(true)
  const [splashLoading,       setSplashLoading]       = useState(false)
  const [splashLoading2,      setSplashLoading2]      = useState(false)
  const [splashSaving,        setSplashSaving]        = useState(false)
  const [splashDragOver,      setSplashDragOver]      = useState(false)
  const [splashDragOver2,     setSplashDragOver2]     = useState(false)
  const splashFileRef  = useRef<HTMLInputElement | null>(null)
  const splashFileRef2 = useRef<HTMLInputElement | null>(null)

  // QR sticker state
  const [zona,       setZona]       = useState<Zona>("general")
  const [qrColor,    setQrColor]    = useState<string>(COLOR_PALETTE[0].value)
  const [topText,    setTopText]    = useState<string>("")
  const [bottomText, setBottomText] = useState<string>("")
  const [bizName,    setBizName]    = useState<string>("Sport Bar")
  const [qrKey,      setQrKey]      = useState(0)
  const [rendering,  setRendering]  = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // ── Load hero slots ──────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/config/hero-slots")
      .then(r => r.json())
      .then((d: { success: boolean; slots: { slot: number; url: string | null; type: string }[] }) => {
        if (!d.success) return
        setSlots(prev => prev.map((s, i) => ({
          ...s,
          url:  d.slots[i]?.url  ?? null,
          type: (['hot','cold','none'].includes(d.slots[i]?.type) ? d.slots[i].type : 'none') as SlotEffectType,
        })))
      })
      .catch(() => {})
  }, [])

  // ── Load portada config ──────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/config/splash")
      .then(r => r.json())
      .then((d: {
        success: boolean
        config: {
          productImage:  string | null
          productImage2: string | null
          productName:   string
          subtitle:      string
          durationSeconds: number
          forceReload:   boolean
        }
      }) => {
        if (!d.success) return
        setSplashProductImage(d.config.productImage)
        setSplashProductImage2(d.config.productImage2)
        setSplashProductName(d.config.productName)
        setSplashSubtitle(d.config.subtitle)
        setSplashDuration(d.config.durationSeconds)
        setSplashForceReload(d.config.forceReload)
      })
      .catch(() => {})
  }, [])

  // ── Load business name ───────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/config/business")
      .then(r => r.json())
      .then((d: { profile?: { business_name?: string } }) => {
        if (d.profile?.business_name) setBizName(d.profile.business_name)
      })
      .catch(() => {})
  }, [])

  // ── Canvas sticker renderer ──────────────────────────────────────────
  const renderSticker = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    setRendering(true)
    const W = 400, H = 500
    const topLabel    = topText.trim()    || "Usa tu cámara"
    const bottomLabel = bottomText.trim() || "tusport.bar"

    // White swatch → invert: white QR modules on SportBar green. Green drives all design elements.
    const effectiveColor = qrColor === "#FFFFFF" ? "#2E7D32" : qrColor

    // ─ Background (off-white premium) ─────────────────────────────────
    ctx.fillStyle = "#f8fafc"
    roundRect(ctx, 0, 0, W, H, [24, 24, 24, 24])
    ctx.fill()

    // ─ Top color bar ──────────────────────────────────────────────────
    ctx.fillStyle = effectiveColor
    roundRect(ctx, 0, 0, W, 74, [24, 24, 0, 0])
    ctx.fill()

    // ─ Top text (call to action) ──────────────────────────────────────
    ctx.fillStyle    = "#ffffff"
    ctx.font         = "bold 20px system-ui, -apple-system, sans-serif"
    ctx.textAlign    = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(topLabel.toUpperCase().slice(0, 35), W / 2, 46)

    // ─ Business name ──────────────────────────────────────────────────
    ctx.fillStyle    = "#0f172a"
    ctx.font         = "bold 21px system-ui, -apple-system, sans-serif"
    ctx.textBaseline = "alphabetic"
    ctx.fillText(bizName.slice(0, 32), W / 2, 114)

    // ─ Scan corners (before QR) ───────────────────────────────────────
    drawCorners(ctx, 48, 124, 304, 30, 5, effectiveColor)

    // ─ Fetch QR SVG & draw ────────────────────────────────────────────
    try {
      const svgRes  = await fetch(
        `/api/qr/generate?zona=${encodeURIComponent(zona)}&color=${encodeURIComponent(qrColor)}&k=${qrKey}`,
      )
      const svgText = await svgRes.text()
      const blob    = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" })
      const blobUrl = URL.createObjectURL(blob)
      await new Promise<void>((resolve) => {
        const img = new window.Image()
        img.onload  = () => { ctx.drawImage(img, 58, 134, 284, 284); URL.revokeObjectURL(blobUrl); resolve() }
        img.onerror = () => { URL.revokeObjectURL(blobUrl); resolve() }
        img.src = blobUrl
      })
    } catch { /* skip — canvas shows without QR */ }

    // ─ Corners redrawn on top for crisp look ──────────────────────────
    drawCorners(ctx, 48, 124, 304, 30, 5, effectiveColor)

    // ─ Bottom text ────────────────────────────────────────────────────
    ctx.fillStyle    = effectiveColor
    ctx.font         = "bold 17px system-ui, -apple-system, sans-serif"
    ctx.textAlign    = "center"
    ctx.textBaseline = "alphabetic"
    ctx.fillText(bottomLabel.slice(0, 45), W / 2, 452)

    // ─ Watermark ──────────────────────────────────────────────────────
    ctx.fillStyle = "#94a3b8"
    ctx.font      = "12px system-ui, -apple-system, sans-serif"
    ctx.fillText("tusport.bar", W / 2, 482)

    setRendering(false)
  }, [topText, bottomText, qrColor, zona, bizName, qrKey])

  // Re-render whenever inputs change
  useEffect(() => {
    void renderSticker()
  }, [renderSticker])

  // ── Download PNG ─────────────────────────────────────────────────────
  function downloadPNG() {
    const canvas = canvasRef.current
    if (!canvas) return
    const link    = document.createElement("a")
    link.download = `sticker-qr-${bizName.toLowerCase().replace(/\s+/g, "-")}-${zona}.png`
    link.href     = canvas.toDataURL("image/png", 1.0)
    link.click()
  }

  // ── Download SVG ─────────────────────────────────────────────────────
  async function downloadSVG() {
    try {
      const res = await fetch(
        `/api/qr/generate?zona=${encodeURIComponent(zona)}&color=${encodeURIComponent(qrColor)}`,
      )
      const svgText = await res.text()
      const blob    = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" })
      const url     = URL.createObjectURL(blob)
      const link    = document.createElement("a")
      link.download = `qr-${zona}.svg`
      link.href     = url
      link.click()
      URL.revokeObjectURL(url)
    } catch { showToast("Error descargando SVG", "err") }
  }

  // ── Toast ────────────────────────────────────────────────────────────
  function showToast(msg: string, type: "ok" | "err") {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Slot upload / delete / drag ──────────────────────────────────────
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
        // data.url ya incluye ?v=timestamp desde la API — no agregar otro cache-buster
        setSlots(prev => prev.map((s, i) => i === idx ? { ...s, url: data.url!, loading: false } : s))
        showToast(`Slot ${slot} guardado`, "ok")
      } else {
        showToast(data.error ?? "Error", "err")
        setSlots(prev => prev.map((s, i) => i === idx ? { ...s, loading: false } : s))
      }
    } catch {
      showToast("Error de red", "err")
      setSlots(prev => prev.map((s, i) => i === idx ? { ...s, loading: false } : s))
    } finally { setSaving(null) }
  }, [])

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
        showToast(`Error al eliminar slot ${slot}`, "err")
      }
    } catch {
      setSlots(prev => prev.map((s, i) => i === idx ? { ...s, loading: false } : s))
      showToast("Error de red al eliminar", "err")
    }
  }

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

  async function setSlotType(idx: number, type: SlotEffectType) {
    const slot = idx + 1
    setSlots(prev => prev.map((s, i) => i === idx ? { ...s, type } : s))
    try {
      await fetch(`/api/config/hero-slot/${slot}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
    } catch { /* silencioso — el estado visual ya cambió */ }
  }

  // ── Portada handlers ─────────────────────────────────────────────────
  const uploadSplash = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) { showToast("Solo imágenes", "err"); return }
    setSplashLoading(true)
    try {
      const fd = new FormData()
      fd.append("image", file)
      const res  = await fetch("/api/config/splash", { method: "POST", body: fd })
      const data = await res.json() as { success: boolean; url?: string; error?: string }
      if (data.success && data.url) {
        setSplashProductImage(data.url)
        showToast("Imagen guardada", "ok")
      } else {
        showToast(data.error ?? "Error al subir imagen", "err")
      }
    } catch {
      showToast("Error de red", "err")
    } finally {
      setSplashLoading(false)
    }
  }, [])

  async function deleteSplash() {
    setSplashLoading(true)
    try {
      const res  = await fetch("/api/config/splash", { method: "DELETE" })
      const data = await res.json() as { success: boolean }
      if (data.success) {
        setSplashProductImage(null)
        showToast("Imagen eliminada", "ok")
      } else {
        showToast("Error al eliminar imagen", "err")
      }
    } catch {
      showToast("Error de red", "err")
    } finally {
      setSplashLoading(false)
    }
  }

  // ── Slot 2 ────────────────────────────────────────────────────────────
  const uploadSplash2 = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) { showToast("Solo imágenes", "err"); return }
    setSplashLoading2(true)
    try {
      const fd = new FormData()
      fd.append("image", file)
      fd.append("slot", "2")
      const res  = await fetch("/api/config/splash", { method: "POST", body: fd })
      const data = await res.json() as { success: boolean; url?: string; error?: string }
      if (data.success && data.url) {
        setSplashProductImage2(data.url)
        showToast("Imagen 2 guardada", "ok")
      } else {
        showToast(data.error ?? "Error al subir imagen 2", "err")
      }
    } catch {
      showToast("Error de red", "err")
    } finally {
      setSplashLoading2(false)
    }
  }, [])

  async function deleteSplash2() {
    setSplashLoading2(true)
    try {
      const res  = await fetch("/api/config/splash?slot=2", { method: "DELETE" })
      const data = await res.json() as { success: boolean }
      if (data.success) {
        setSplashProductImage2(null)
        showToast("Imagen 2 eliminada", "ok")
      } else {
        showToast("Error al eliminar imagen 2", "err")
      }
    } catch {
      showToast("Error de red", "err")
    } finally {
      setSplashLoading2(false)
    }
  }

  async function saveSplashConfig() {
    setSplashSaving(true)
    try {
      const res = await fetch("/api/config/splash", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName:     splashProductName,
          subtitle:        splashSubtitle,
          durationSeconds: splashDuration,
          forceReload:     splashForceReload,
        }),
      })
      const data = await res.json() as { success: boolean; error?: string }
      if (data.success) {
        showToast("Portada guardada", "ok")
      } else {
        showToast(data.error ?? "Error al guardar", "err")
      }
    } catch {
      showToast("Error de red", "err")
    } finally {
      setSplashSaving(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      {/* Toast */}
      {toast && (
        <div className={`${styles.toast} ${toast.type === "ok" ? styles.toastOk : styles.toastErr}`}>
          {toast.msg}
        </div>
      )}

      {/* Lightbox */}
      {preview && (
        <div className={styles.lightbox} onClick={() => setPreview(null)}>
          <button className={styles.lightboxClose} onClick={() => setPreview(null)}><X size={22} /></button>
          <img src={preview} className={styles.lightboxImg} alt="preview" onClick={e => e.stopPropagation()} />
        </div>
      )}

      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>Marketing</h1>
        <p className={styles.pageSub}>Hero slider publicitario y sticker QR de acceso</p>
      </div>

      {/* ── HERO SLIDER ──────────────────────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <ImageIcon size={18} className={styles.sectionIcon} />
          <div>
            <h2 className={styles.sectionTitle}>Hero Slider</h2>
            <p className={styles.sectionSub}>Hasta 5 imágenes • Encima del menú público • Autoplay 4s</p>
          </div>
        </div>

        <div className={styles.slotsGrid}>
          {slots.map((slot, idx) => (
            <div key={idx} className={styles.slotCard}>
              {/* Imagen */}
              <div
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
                  <img src={slot.url} alt={`Slot ${idx + 1}`} className={styles.slotImg} />
                ) : (
                  <div className={styles.slotEmpty}>
                    <Upload size={28} className={styles.slotEmptyIcon} />
                    <span className={styles.slotEmptyLabel}>Arrastra o click</span>
                    <span className={styles.slotEmptyHint}>JPG · PNG · WebP</span>
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

              {/* Acciones — siempre visibles en mobile y desktop */}
              {slot.url && !slot.loading && (
                <div className={styles.slotActionsRow}>
                  <button className={styles.slotAction} onClick={() => setPreview(slot.url!)} title="Ver"><ZoomIn size={14} /></button>
                  <button className={styles.slotAction} onClick={() => fileRefs.current[idx]?.click()} title="Reemplazar"><Upload size={14} /></button>
                  <button className={`${styles.slotAction} ${styles.slotDelete}`} onClick={() => void deleteSlot(idx)} title="Eliminar" disabled={saving === idx}><Trash2 size={14} /></button>
                </div>
              )}

              {/* Efecto temperatura — siempre visible cuando hay imagen */}
              {slot.url && !slot.loading && (
                <div className={styles.slotTypeBar}>
                  <button
                    className={`${styles.slotTypeBtn} ${slot.type === 'hot'  ? styles.slotTypeBtnHot  : ''}`}
                    onClick={() => void setSlotType(idx, 'hot')}
                    title="Caliente — vapor"
                  ><Flame size={12} /></button>
                  <button
                    className={`${styles.slotTypeBtn} ${slot.type === 'none' ? styles.slotTypeBtnNone : ''}`}
                    onClick={() => void setSlotType(idx, 'none')}
                    title="Sin efecto"
                  ><Minus size={12} /></button>
                  <button
                    className={`${styles.slotTypeBtn} ${slot.type === 'cold' ? styles.slotTypeBtnCold : ''}`}
                    onClick={() => void setSlotType(idx, 'cold')}
                    title="Frío — condensación"
                  ><Snowflake size={12} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
        <p className={styles.slotHint}>Arte recomendado: <strong>1440 × 400 px</strong> — Autoplay cada 4 segundos.</p>
      </section>

      {/* ── PORTADA (SPLASH SCREEN) ──────────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <Layers size={18} className={styles.sectionIcon} />
          <div>
            <h2 className={styles.sectionTitle}>Portada</h2>
            <p className={styles.sectionSub}>Pantalla de bienvenida al abrir el menú • Configurable por partido</p>
          </div>
        </div>

        <div className={styles.portadaGrid}>

          {/* ── Columna imagen ── */}
          <div className={styles.portadaImageCol}>
            <div
              className={`${styles.portadaImageBox} ${splashDragOver ? styles.portadaImageBoxOver : ""}`}
              onDragOver={e => { e.preventDefault(); setSplashDragOver(true) }}
              onDragLeave={() => setSplashDragOver(false)}
              onDrop={e => { e.preventDefault(); setSplashDragOver(false); const f = e.dataTransfer.files[0]; if (f) void uploadSplash(f) }}
              onClick={() => !splashProductImage && splashFileRef.current?.click()}
            >
              {splashLoading ? (
                <RefreshCw size={28} className={styles.spin} color="var(--color-brand)" />
              ) : splashProductImage ? (
                <img src={splashProductImage} alt="Imagen portada" className={styles.portadaImagePreview} />
              ) : (
                <div className={styles.portadaImageEmpty}>
                  <Upload size={32} className={styles.portadaImageEmptyIcon} />
                  <span className={styles.portadaImageEmptyLabel}>PNG transparente</span>
                  <span className={styles.portadaImageEmptyHint}>mín 800 × 800 px</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                ref={splashFileRef}
                className={styles.fileInput}
                onChange={e => { const f = e.target.files?.[0]; if (f) void uploadSplash(f); e.target.value = "" }}
              />
            </div>

            {splashProductImage && !splashLoading && (
              <div className={styles.portadaImageActions}>
                <button className={styles.slotAction} onClick={() => setPreview(splashProductImage)} title="Ver"><ZoomIn size={13} /></button>
                <button className={styles.slotAction} onClick={() => splashFileRef.current?.click()} title="Reemplazar"><Upload size={13} /></button>
                <button className={`${styles.slotAction} ${styles.slotDelete}`} onClick={() => void deleteSplash()} title="Eliminar"><Trash2 size={13} /></button>
              </div>
            )}

            <p className={styles.splashHint}>
              <span className={styles.splashHintStrong}>PNG con fondo transparente</span>{" "}
              para efecto flotante. El sujeto principal debe estar centrado.
            </p>

            {/* ── Slot 2 — modo slider ─────────────── */}
            <div className={styles.portadaSlot2Sep}>
              <span className={styles.portadaSlot2Label}>Imagen 2</span>
              <span className={styles.portadaSlot2Badge}>SLIDER</span>
              <div className={styles.portadaSlot2Line} />
            </div>

            <div
              className={`${styles.portadaImageBox} ${styles.portadaImageBox2} ${splashDragOver2 ? styles.portadaImageBoxOver : ""}`}
              onDragOver={e => { e.preventDefault(); setSplashDragOver2(true) }}
              onDragLeave={() => setSplashDragOver2(false)}
              onDrop={e => { e.preventDefault(); setSplashDragOver2(false); const f = e.dataTransfer.files[0]; if (f) void uploadSplash2(f) }}
              onClick={() => !splashProductImage2 && splashFileRef2.current?.click()}
            >
              {splashLoading2 ? (
                <RefreshCw size={20} className={styles.spin} color="var(--color-brand)" />
              ) : splashProductImage2 ? (
                <img src={splashProductImage2} alt="Imagen portada 2" className={styles.portadaImagePreview} />
              ) : (
                <div className={styles.portadaImageEmpty}>
                  <Upload size={20} className={styles.portadaImageEmptyIcon} />
                  <span className={styles.portadaImageEmptyHint}>Opcional</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                ref={splashFileRef2}
                className={styles.fileInput}
                onChange={e => { const f = e.target.files?.[0]; if (f) void uploadSplash2(f); e.target.value = "" }}
              />
            </div>

            {splashProductImage2 && !splashLoading2 && (
              <div className={styles.portadaImageActions}>
                <button className={styles.slotAction} onClick={() => setPreview(splashProductImage2)} title="Ver"><ZoomIn size={13} /></button>
                <button className={styles.slotAction} onClick={() => splashFileRef2.current?.click()} title="Reemplazar"><Upload size={13} /></button>
                <button className={`${styles.slotAction} ${styles.slotDelete}`} onClick={() => void deleteSplash2()} title="Eliminar"><Trash2 size={13} /></button>
              </div>
            )}

            <p className={styles.splashHint}>
              Si cargas esta imagen, la portada alterna entre ambas automáticamente.
            </p>
          </div>

          {/* ── Columna formulario ── */}
          <div className={styles.portadaFormCol}>

            {/* Nombre del producto */}
            <div className={styles.portadaField}>
              <label className={styles.portadaLabel}>Nombre del producto / promo</label>
              <input
                className={styles.portadaInput}
                type="text"
                maxLength={32}
                placeholder="Ej: BACONISE, PROMO CERVEZA…"
                value={splashProductName}
                onChange={e => setSplashProductName(e.target.value)}
              />
              <span className={styles.portadaHelp}>Este nombre aparece animado en la portada. Cámbialo cada partido.</span>
            </div>

            {/* Subtítulo */}
            <div className={styles.portadaField}>
              <label className={styles.portadaLabel}>Subtítulo</label>
              <input
                className={styles.portadaInput}
                type="text"
                maxLength={52}
                placeholder="Ej: El menú del partido, Solo por hoy…"
                value={splashSubtitle}
                onChange={e => setSplashSubtitle(e.target.value)}
              />
            </div>

            {/* Timing */}
            <div className={styles.portadaField}>
              <label className={styles.portadaLabel}>Duración</label>
              <div className={styles.portadaSliderRow}>
                <input
                  type="range"
                  min={2} max={8} step={1}
                  value={splashDuration}
                  className={styles.portadaSlider}
                  style={{ "--slider-pct": `${((splashDuration - 2) / 6) * 100}%` } as React.CSSProperties}
                  onChange={e => setSplashDuration(Number(e.target.value))}
                />
                <span className={styles.portadaSliderValue}>{splashDuration}s</span>
              </div>
              <span className={styles.portadaHelp}>Tiempo antes de que el usuario pueda entrar al menú</span>
            </div>

            {/* Force reload toggle */}
            <div className={styles.portadaField}>
              <label className={styles.portadaLabel}>Forzar recarga</label>
              <button
                type="button"
                className={styles.portadaToggleRow}
                onClick={() => setSplashForceReload(v => !v)}
              >
                <div className={`${styles.portadaToggleTrack} ${splashForceReload ? styles.portadaToggleTrackOn : ""}`}>
                  <div className={styles.portadaToggleKnob} />
                </div>
                <div>
                  <div className={styles.portadaToggleText}>
                    {splashForceReload ? "ON — siempre muestra la portada" : "OFF — solo la primera vez por sesión"}
                  </div>
                  <div className={styles.portadaToggleHint}>
                    {splashForceReload
                      ? "El splash aparece cada vez que el cliente abre el menú"
                      : "Solo aparece una vez por sesión de navegador"}
                  </div>
                </div>
              </button>
            </div>

            {/* Botón guardar */}
            <div className={styles.portadaSaveRow}>
              <button
                className={styles.portadaSaveBtn}
                onClick={() => void saveSplashConfig()}
                disabled={splashSaving}
              >
                {splashSaving
                  ? <><RefreshCw size={14} className={styles.spin} /> Guardando…</>
                  : <><Save size={14} /> Guardar portada</>
                }
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* ── QR STICKER BUILDER ──────────────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <QrCode size={18} className={styles.sectionIcon} />
          <div>
            <h2 className={styles.sectionTitle}>Sticker QR de Acceso</h2>
            <p className={styles.sectionSub}>Personaliza, previsualiza y descarga tu sticker imprimible</p>
          </div>
        </div>

        <div className={styles.stickerLayout}>

          {/* ── Left: controls ─────────────────────────────────────── */}
          <div className={styles.stickerControls}>

            {/* Zona */}
            <div className={styles.controlGroup}>
              <label className={styles.controlLabel}>Zona destino</label>
              <div className={styles.zonaGrid}>
                {ZONAS.map(z => (
                  <button
                    key={z}
                    className={`${styles.zonaBtn} ${zona === z ? styles.zonaBtnActive : ""}`}
                    onClick={() => setZona(z)}
                  >
                    {z === "general" ? "General" : z}
                  </button>
                ))}
              </div>
              <p className={styles.urlPreview}>tusport.bar/menu?ref=qr&amp;zona={zona}</p>
            </div>

            {/* Color palette */}
            <div className={styles.controlGroup}>
              <label className={styles.controlLabel}>Color del QR</label>
              <div className={styles.colorPalette}>
                {COLOR_PALETTE.map(c => (
                  <button
                    key={c.value}
                    className={`${styles.colorSwatch} ${qrColor === c.value ? styles.colorSwatchActive : ""}`}
                    style={{ "--swatch-color": c.value } as React.CSSProperties}
                    onClick={() => setQrColor(c.value)}
                    aria-label={c.label}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            {/* Top text */}
            <div className={styles.controlGroup}>
              <label className={styles.controlLabel}>Texto superior</label>
              <input
                className={styles.controlInput}
                type="text"
                maxLength={35}
                placeholder="Ej: USA TU CÁMARA"
                value={topText}
                onChange={e => setTopText(e.target.value)}
              />
              <span className={styles.inputHint}>Vacío → "ESCANEA AQUÍ"</span>
            </div>

            {/* Bottom text */}
            <div className={styles.controlGroup}>
              <label className={styles.controlLabel}>Texto inferior</label>
              <input
                className={styles.controlInput}
                type="text"
                maxLength={45}
                placeholder="Ej: Menú Digital · Ordena desde tu asiento"
                value={bottomText}
                onChange={e => setBottomText(e.target.value)}
              />
              <span className={styles.inputHint}>Vacío → "tusport.bar"</span>
            </div>

            {/* Business name display */}
            <div className={styles.controlGroup}>
              <label className={styles.controlLabel}>Nombre del negocio</label>
              <div className={styles.bizNameDisplay}>{bizName}</div>
              <span className={styles.inputHint}>Tomado de Config → Perfil</span>
            </div>

            {/* Regenerar */}
            <button
              className={styles.btnRegenerate}
              onClick={() => setQrKey(k => k + 1)}
              disabled={rendering}
            >
              <RefreshCw size={14} className={rendering ? styles.spin : ""} />
              {rendering ? "Generando…" : "Regenerar QR"}
            </button>

            {/* Download actions */}
            <div className={styles.stickerActions}>
              <button
                className={styles.btnDownloadPng}
                onClick={downloadPNG}
                disabled={rendering}
              >
                <Download size={15} />
                Descargar PNG
              </button>
              <button
                className={styles.btnDownloadSvg}
                onClick={() => void downloadSVG()}
                disabled={rendering}
              >
                <FileImage size={15} />
                SVG
              </button>
            </div>
          </div>

          {/* ── Right: canvas preview ─────────────────────────────── */}
          <div className={styles.stickerPreviewWrap}>
            <div className={styles.stickerPreviewLabel}>Vista previa</div>
            <canvas
              ref={canvasRef}
              width={400}
              height={500}
              className={styles.stickerCanvas}
            />
          </div>

        </div>
      </section>
    </div>
  )
}
