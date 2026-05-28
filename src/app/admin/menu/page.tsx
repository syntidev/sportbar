'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { UtensilsCrossed, Wine, Beef, AlertCircle, Pencil, Eye, EyeOff, ImagePlus, Camera, Loader2 } from 'lucide-react'
import styles from './page.module.css'

type Category = 'hamburguesas' | 'raciones' | 'bebidas'

interface Product {
  id:          number
  name:        string
  description: string | null
  price_usd:   string
  category:    Category
  image_url:   string | null
  is_active:   boolean
}

const CATEGORY_META: Record<Category, { label: string; icon: typeof Beef; color: string }> = {
  hamburguesas: { label: 'Hamburguesas', icon: Beef,            color: 'var(--color-primary)'  },
  raciones:     { label: 'Raciones',     icon: UtensilsCrossed, color: 'var(--color-brand)'    },
  bebidas:      { label: 'Bebidas',      icon: Wine,            color: 'var(--color-credito)'  },
}

const CATEGORY_ORDER: Category[] = ['hamburguesas', 'raciones', 'bebidas']

export default function AdminMenuPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [toggling,  setToggling]  = useState<number | null>(null)
  const [uploading, setUploading] = useState<Set<number>>(new Set())
  const [previews,  setPreviews]  = useState<Record<number, string>>({})
  const previewsRef = useRef(previews)
  previewsRef.current = previews

  // Revoke blob URLs on unmount
  useEffect(() => () => { Object.values(previewsRef.current).forEach(URL.revokeObjectURL) }, [])

  useEffect(() => {
    fetch('/api/products?all=true')
      .then((r) => r.json())
      .then((data: { success: boolean; products: Product[]; error?: string }) => {
        if (!data.success) throw new Error(data.error)
        setProducts(data.products)
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Error desconocido'))
      .finally(() => setLoading(false))
  }, [])

  const handleToggle = useCallback(async (id: number, current: boolean) => {
    setToggling(id)
    try {
      const res  = await fetch(`/api/products/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ is_active: !current }),
      })
      const data = await res.json() as { success: boolean; error?: string }
      if (!data.success) throw new Error(data.error)
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, is_active: !current } : p)))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al actualizar producto')
    } finally {
      setToggling(null)
    }
  }, [])

  const handleUpload = useCallback(async (id: number, file: File | undefined) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('La imagen no puede superar 5 MB'); return }

    // Immediate local preview
    const blobUrl = URL.createObjectURL(file)
    setPreviews((prev) => ({ ...prev, [id]: blobUrl }))
    setUploading((prev) => new Set(prev).add(id))

    try {
      const fd = new FormData()
      fd.append('file', file)
      const res  = await fetch(`/api/products/${id}/upload`, { method: 'POST', body: fd })
      const data = await res.json() as { success: boolean; image_url?: string; error?: string }
      if (!data.success) throw new Error(data.error)
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, image_url: data.image_url ?? null } : p)),
      )
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al subir imagen')
    } finally {
      URL.revokeObjectURL(blobUrl)
      setPreviews((prev) => { const n = { ...prev }; delete n[id]; return n })
      setUploading((prev) => { const n = new Set(prev); n.delete(id); return n })
    }
  }, [])

  const grouped = CATEGORY_ORDER.reduce<Record<Category, Product[]>>(
    (acc, cat) => {
      acc[cat] = products.filter((p) => p.category === cat)
      return acc
    },
    { hamburguesas: [], raciones: [], bebidas: [] },
  )

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Menú</h1>
        <p className={styles.subtitle}>Todos los productos · Precios en REF</p>
      </header>

      {loading && (
        <div className={styles.state}>
          <span className={styles.spinner} />
          <span className={styles.stateText}>Cargando productos…</span>
        </div>
      )}

      {error && (
        <div className={`${styles.state} ${styles.stateError}`}>
          <AlertCircle size={20} aria-hidden />
          <span className={styles.stateText}>{error}</span>
        </div>
      )}

      {!loading && !error && (
        <div className={styles.sections}>
          {CATEGORY_ORDER.map((cat) => {
            const meta  = CATEGORY_META[cat]
            const items = grouped[cat]
            const Icon  = meta.icon
            if (items.length === 0) return null

            return (
              <section key={cat} className={styles.section}>
                <div className={styles.sectionHeader}>
                  <span
                    className={styles.sectionIcon}
                    style={{ '--cat-color': meta.color } as React.CSSProperties}
                  >
                    <Icon size={14} strokeWidth={2} />
                  </span>
                  <h2 className={styles.sectionTitle}>{meta.label}</h2>
                  <span className={styles.sectionCount}>{items.length}</span>
                </div>

                <div className={styles.grid}>
                  {items.map((p) => {
                    const isUploading  = uploading.has(p.id)
                    const currentImage = previews[p.id] ?? p.image_url

                    return (
                      <article
                        key={p.id}
                        className={[
                          styles.card,
                          !p.is_active    ? styles.cardInactive  : '',
                          currentImage    ? styles.cardHasImage  : '',
                        ].join(' ')}
                        style={{ '--cat-color': meta.color } as React.CSSProperties}
                      >
                        {/* ── Media area ───────────────────────────── */}
                        <div className={styles.cardMedia}>
                          {currentImage ? (
                            <div className={styles.cardImageWrap}>
                              <img
                                src={currentImage}
                                alt={p.name}
                                className={styles.cardImage}
                              />
                            </div>
                          ) : (
                            <label
                              htmlFor={`photo-${p.id}`}
                              className={styles.cardPlaceholder}
                              aria-label="Agregar foto al producto"
                            >
                              {isUploading ? (
                                <Loader2 size={26} className={styles.spinnerIcon} aria-hidden />
                              ) : (
                                <>
                                  <ImagePlus size={28} className={styles.placeholderIcon} aria-hidden />
                                  <span className={styles.placeholderText}>Agregar foto</span>
                                </>
                              )}
                            </label>
                          )}

                          {/* Gradient overlay + product name */}
                          {currentImage && (
                            <>
                              <div className={styles.cardOverlay} />
                              <span className={styles.cardNameOverlay}>{p.name}</span>
                            </>
                          )}

                          {/* Price badge — always visible on image */}
                          {currentImage && (
                            <span className={styles.priceBadge}>
                              <span className={styles.priceRef}>REF</span>
                              {' '}{Number(p.price_usd).toFixed(2)}
                            </span>
                          )}

                          {/* Change photo — appears on hover over image */}
                          {currentImage && (
                            isUploading ? (
                              <div className={styles.uploadOverlay}>
                                <Loader2 size={20} className={styles.spinnerIcon} aria-hidden />
                              </div>
                            ) : (
                              <label
                                htmlFor={`photo-${p.id}`}
                                className={styles.changePhotoBtn}
                                aria-label="Cambiar foto"
                              >
                                <Camera size={11} aria-hidden />
                                Cambiar
                              </label>
                            )
                          )}
                        </div>

                        {/* ── Hidden file input ─────────────────────── */}
                        <input
                          type="file"
                          id={`photo-${p.id}`}
                          accept="image/webp,image/jpeg,image/png"
                          className={styles.photoInput}
                          disabled={isUploading}
                          onChange={(e) => {
                            handleUpload(p.id, e.target.files?.[0])
                            e.target.value = ''
                          }}
                        />

                        {/* ── Card body ─────────────────────────────── */}
                        <div className={styles.cardBody}>
                          {/* Name + price only when no image */}
                          {!currentImage && (
                            <div className={styles.cardTop}>
                              <span className={styles.cardName}>{p.name}</span>
                              <span className={styles.cardPrice}>
                                <span className={styles.cardPriceRef}>REF</span>
                                {Number(p.price_usd).toFixed(2)}
                              </span>
                            </div>
                          )}

                          {p.description && (
                            <p className={styles.cardDesc}>{p.description}</p>
                          )}

                          <div className={styles.cardFooter}>
                            <span className={`${styles.badge} ${styles[`badge_${cat}`]}`}>
                              <Icon size={10} aria-hidden />
                              {meta.label}
                            </span>

                            <div className={styles.cardActions}>
                              <button
                                type="button"
                                onClick={() => handleToggle(p.id, p.is_active)}
                                disabled={toggling === p.id}
                                aria-label={p.is_active ? 'Desactivar' : 'Activar'}
                                aria-pressed={p.is_active}
                                className={`${styles.actionBtn} ${p.is_active ? styles.toggleOn : styles.toggleOff}`}
                              >
                                {p.is_active
                                  ? <Eye size={13} aria-hidden />
                                  : <EyeOff size={13} aria-hidden />}
                              </button>

                              <button
                                type="button"
                                aria-label={`Editar ${p.name}`}
                                className={`${styles.actionBtn} ${styles.editBtn}`}
                              >
                                <Pencil size={13} aria-hidden />
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
