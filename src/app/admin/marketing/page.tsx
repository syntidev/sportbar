"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Download, FileImage, Image as ImageIcon, QrCode, RefreshCw,
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
    Array.from({ length: 5 }, () => ({ url: null, loading: false, dragOver: false })),
  )
  const [saving,  setSaving]  = useState<number | null>(null)
  const [toast,   setToast]   = useState<{ msg: string; type: "ok" | "err" } | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const fileRefs = useRef<(HTMLInputElement | null)[]>([])

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
      .then((d: { success: boolean; slots: { slot: number; url: string | null }[] }) => {
        if (!d.success) return
        setSlots(prev => prev.map((s, i) => ({ ...s, url: d.slots[i]?.url ?? null })))
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
    const W = 400, H = 520
    const topLabel    = topText.trim()    || "ESCANEA AQUÍ"
    const bottomLabel = bottomText.trim() || "tusport.bar"
    const isLight     = qrColor === "#FFFFFF"
    const onColor     = isLight ? "#0a0a0a" : "#ffffff"

    // ─ Background ─────────────────────────────────────────────────────
    ctx.fillStyle = "#111411"
    roundRect(ctx, 0, 0, W, H, [20, 20, 20, 20])
    ctx.fill()

    // ─ Top color bar ──────────────────────────────────────────────────
    ctx.fillStyle = qrColor
    roundRect(ctx, 0, 0, W, 72, [20, 20, 0, 0])
    ctx.fill()

    // ─ Top text (call to action) ──────────────────────────────────────
    ctx.fillStyle   = onColor
    ctx.font        = "bold 20px system-ui, -apple-system, sans-serif"
    ctx.textAlign   = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(topLabel.toUpperCase().slice(0, 35), W / 2, 36)

    // ─ Business name ──────────────────────────────────────────────────
    ctx.fillStyle    = "#f0f5f0"
    ctx.font         = "bold 19px system-ui, -apple-system, sans-serif"
    ctx.textBaseline = "alphabetic"
    ctx.fillText(bizName.slice(0, 32), W / 2, 108)

    // ─ White backing for monochrome (black) QR ───────────────────────
    if (qrColor === '#0a0a0a') {
      ctx.fillStyle = '#FFFFFF'
      roundRect(ctx, 46, 116, 308, 308, [6, 6, 6, 6])
      ctx.fill()
    }

    // ─ Scan corners (before QR) ───────────────────────────────────────
    drawCorners(ctx, 48, 118, 304, 28, 5, qrColor)

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
        img.onload  = () => { ctx.drawImage(img, 58, 128, 284, 284); URL.revokeObjectURL(blobUrl); resolve() }
        img.onerror = () => { URL.revokeObjectURL(blobUrl); resolve() }
        img.src = blobUrl
      })
    } catch { /* skip — canvas shows without QR */ }

    // ─ Corners again on top of QR ─────────────────────────────────────
    drawCorners(ctx, 48, 118, 304, 28, 5, qrColor)

    // ─ Bottom text ────────────────────────────────────────────────────
    ctx.fillStyle    = qrColor
    ctx.font         = "bold 16px system-ui, -apple-system, sans-serif"
    ctx.textAlign    = "center"
    ctx.textBaseline = "alphabetic"
    ctx.fillText(bottomLabel.slice(0, 45), W / 2, 452)

    // ─ Watermark ──────────────────────────────────────────────────────
    ctx.fillStyle = "rgba(240,245,240,0.28)"
    ctx.font      = "11px system-ui, -apple-system, sans-serif"
    ctx.fillText("tusport.bar", W / 2, 474)

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
        setSlots(prev => prev.map((s, i) => i === idx ? { ...s, url: data.url + "&r=" + Date.now(), loading: false } : s))
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
      }
    } catch {
      setSlots(prev => prev.map((s, i) => i === idx ? { ...s, loading: false } : s))
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
                    <button className={styles.slotAction} onClick={e => { e.stopPropagation(); setPreview(slot.url!) }} title="Ver"><ZoomIn size={16} /></button>
                    <button className={styles.slotAction} onClick={e => { e.stopPropagation(); fileRefs.current[idx]?.click() }} title="Reemplazar"><Upload size={16} /></button>
                    <button className={`${styles.slotAction} ${styles.slotDelete}`} onClick={e => { e.stopPropagation(); void deleteSlot(idx) }} title="Eliminar" disabled={saving === idx}><Trash2 size={16} /></button>
                  </div>
                </>
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
          ))}
        </div>
        <p className={styles.slotHint}>Arte recomendado: <strong>1440 × 400 px</strong> — Autoplay cada 4 segundos.</p>
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
              height={520}
              className={styles.stickerCanvas}
            />
          </div>

        </div>
      </section>
    </div>
  )
}
