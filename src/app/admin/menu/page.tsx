'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { z } from 'zod'
import {
  UtensilsCrossed, Wine, Beef, AlertCircle, Pencil, Eye, EyeOff,
  ImagePlus, Camera, Loader2, Plus, Trash2, X, Check, LayoutGrid,
} from 'lucide-react'
import ImportButton from './ImportButton'
import styles from './page.module.css'
import type { Category } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Product {
  id:          number
  name:        string
  description: string | null
  price_usd:   string
  category:    Category
  image_url:   string | null
  is_active:   boolean
}

interface CategoryStat {
  key:    Category
  total:  number
  active: number
}

type ModalState =
  | { kind: 'create' }
  | { kind: 'edit'; product: Product }

interface ToastState {
  msg: string
  ok:  boolean
}

type FormErrors = Partial<Record<'name' | 'price_usd' | 'category', string>>

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<Category, { label: string; Icon: typeof Beef; color: string }> = {
  hamburguesas: { label: 'Hamburguesas', Icon: Beef,            color: 'var(--color-primary)'  },
  raciones:     { label: 'Raciones',     Icon: UtensilsCrossed, color: 'var(--color-brand)'    },
  bebidas:      { label: 'Bebidas',      Icon: Wine,            color: 'var(--color-credito)'  },
}

const CATEGORY_ORDER: Category[] = ['hamburguesas', 'raciones', 'bebidas']

// ── Frontend Zod schema ───────────────────────────────────────────────────────

const ProductFormSchema = z.object({
  name:      z.string().trim().min(1, 'Nombre requerido').max(100, 'Maximo 100 caracteres'),
  price_usd: z.coerce.number({ error: 'Precio invalido' }).positive('El precio debe ser mayor a 0'),
  category:  z.enum(['hamburguesas', 'raciones', 'bebidas']),
  is_active: z.boolean(),
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const SPRING = { type: 'spring', damping: 28, stiffness: 300 } as const

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminMenuPage() {
  // ── Data state ──────────────────────────────────────────────────────────────
  const [products,  setProducts]  = useState<Product[]>([])
  const [catStats,  setCatStats]  = useState<CategoryStat[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [filter,        setFilter]        = useState<Category | 'all'>('all')
  const [modal,         setModal]         = useState<ModalState | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null)
  const [toast,         setToast]         = useState<ToastState | null>(null)
  const toastTimer                        = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Per-card state ───────────────────────────────────────────────────────────
  const [toggling,  setToggling]  = useState<number | null>(null)
  const [uploading, setUploading] = useState<Set<number>>(new Set())
  const [previews,  setPreviews]  = useState<Record<number, string>>({})
  const previewsRef               = useRef(previews)
  previewsRef.current             = previews

  // ── Operation state ──────────────────────────────────────────────────────────
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Revoke blob URLs on unmount
  useEffect(() => () => { Object.values(previewsRef.current).forEach(URL.revokeObjectURL) }, [])

  // ── Fetch ─────────────────────────────────────────────────────────────────────

  const fetchProducts = useCallback(async () => {
    try {
      const [pRes, cRes] = await Promise.all([
        fetch('/api/products?all=true'),
        fetch('/api/categories'),
      ])
      const [pData, cData] = await Promise.all([
        pRes.json() as Promise<{ success: boolean; products: Product[]; error?: string }>,
        cRes.json() as Promise<{ success: boolean; categories: CategoryStat[]; error?: string }>,
      ])
      if (!pData.success) throw new Error(pData.error)
      setProducts(pData.products)
      if (cData.success) setCatStats(cData.categories)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchProducts() }, [fetchProducts])

  // ── Toast helper ──────────────────────────────────────────────────────────────

  const showToast = useCallback((msg: string, ok = true) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ msg, ok })
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }, [])

  // ── Toggle active ─────────────────────────────────────────────────────────────

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
      showToast(current ? 'Producto desactivado' : 'Producto activado')
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error al actualizar', false)
    } finally {
      setToggling(null)
    }
  }, [showToast])

  // ── Photo upload (inline card) ────────────────────────────────────────────────

  const handleUpload = useCallback(async (id: number, file: File | undefined) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { showToast('La imagen no puede superar 5 MB', false); return }

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
      showToast('Foto actualizada')
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error al subir imagen', false)
    } finally {
      URL.revokeObjectURL(blobUrl)
      setPreviews((prev) => { const n = { ...prev }; delete n[id]; return n })
      setUploading((prev) => { const n = new Set(prev); n.delete(id); return n })
    }
  }, [showToast])

  // ── Delete ────────────────────────────────────────────────────────────────────

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      const res  = await fetch(`/api/products/${confirmDelete.id}`, { method: 'DELETE' })
      const data = await res.json() as { success: boolean; error?: string }
      if (!data.success) throw new Error(data.error)
      setProducts((prev) => prev.filter((p) => p.id !== confirmDelete.id))
      setCatStats((prev) =>
        prev.map((c) =>
          c.key === confirmDelete.category
            ? {
                ...c,
                total:  Math.max(0, c.total - 1),
                active: confirmDelete.is_active ? Math.max(0, c.active - 1) : c.active,
              }
            : c,
        ),
      )
      setConfirmDelete(null)
      showToast(`"${confirmDelete.name}" eliminado`)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error al eliminar', false)
    } finally {
      setDeleting(false)
    }
  }, [confirmDelete, showToast])

  // ── Save (create or edit) ─────────────────────────────────────────────────────

  const handleSave = useCallback(async (
    form:     { name: string; description: string; price_usd: string; category: Category; is_active: boolean },
    photoFile: File | null,
    onErrors:  (errs: FormErrors) => void,
  ) => {
    // Frontend Zod validation
    const parsed = ProductFormSchema.safeParse({
      name:      form.name,
      price_usd: form.price_usd,
      category:  form.category,
      is_active: form.is_active,
    })

    if (!parsed.success) {
      const errs: FormErrors = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof FormErrors
        errs[field] = issue.message
      }
      onErrors(errs)
      return
    }

    const body = {
      name:        form.name.trim(),
      description: form.description.trim() || undefined,
      price_usd:   parsed.data.price_usd,
      category:    parsed.data.category,
      is_active:   parsed.data.is_active,
    }

    setSaving(true)
    try {
      let productId: number

      if (modal?.kind === 'edit') {
        // PUT -- update
        const res  = await fetch(`/api/products/${modal.product.id}`, {
          method:  'PUT',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(body),
        })
        const data = await res.json() as { success: boolean; product?: Product; error?: string }
        if (!data.success) throw new Error(data.error)
        productId = modal.product.id
        if (data.product) {
          setProducts((prev) => prev.map((p) => (p.id === productId ? data.product! : p)))
        }
        showToast('Producto actualizado')
      } else {
        // POST -- create
        const res  = await fetch('/api/products', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(body),
        })
        const data = await res.json() as { success: boolean; product?: Product; error?: string }
        if (!data.success) throw new Error(data.error)
        if (!data.product) throw new Error('Respuesta invalida del servidor')
        productId = data.product.id
        setProducts((prev) => [...prev, data.product!])
        setCatStats((prev) =>
          prev.map((c) =>
            c.key === body.category
              ? { ...c, total: c.total + 1, active: body.is_active ? c.active + 1 : c.active }
              : c,
          ),
        )
        showToast('Producto creado')
      }

      // Upload photo if a file was selected
      if (photoFile) {
        const fd = new FormData()
        fd.append('file', photoFile)
        const uRes  = await fetch(`/api/products/${productId}/upload`, { method: 'POST', body: fd })
        const uData = await uRes.json() as { success: boolean; image_url?: string }
        if (uData.success && uData.image_url) {
          setProducts((prev) =>
            prev.map((p) => (p.id === productId ? { ...p, image_url: uData.image_url! } : p)),
          )
        }
      }

      setModal(null)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error al guardar', false)
    } finally {
      setSaving(false)
    }
  }, [modal, showToast])

  // ── Filtered list ─────────────────────────────────────────────────────────────

  const grouped = CATEGORY_ORDER.reduce<Record<Category, Product[]>>(
    (acc, cat) => {
      acc[cat] = products.filter((p) =>
        p.category === cat && (filter === 'all' || filter === cat),
      )
      return acc
    },
    { hamburguesas: [], raciones: [], bebidas: [] },
  )

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Menu</h1>
          <p className={styles.subtitle}>Gestion de productos · Precios en REF</p>
        </div>
        <div className={styles.headerActions}>
          <ImportButton onSuccess={fetchProducts} />
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => setModal({ kind: 'create' })}
          >
            <Plus size={16} aria-hidden />
            Nuevo producto
          </button>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className={styles.errorBanner} role="alert">
          <AlertCircle size={16} aria-hidden />
          <span>{error}</span>
          <button type="button" className={styles.errorDismiss} onClick={() => setError(null)} aria-label="Cerrar">x</button>
        </div>
      )}

      {/* Category stats panel */}
      {catStats.length > 0 && (
        <div className={styles.catPanel}>
          {catStats.map(({ key, total, active }) => {
            const { label, Icon, color } = CATEGORY_META[key]
            return (
              <div
                key={key}
                className={styles.catCard}
                style={{ '--cat-color': color } as React.CSSProperties}
              >
                <div className={styles.catCardIcon}><Icon size={15} aria-hidden /></div>
                <div className={styles.catCardBody}>
                  <span className={styles.catCardLabel}>{label}</span>
                  <span className={styles.catCardCount}>{active} activo{active !== 1 ? 's' : ''} / {total} total</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Filter bar */}
      <div className={styles.filterBar} role="group" aria-label="Filtrar por categoria">
        <button
          type="button"
          className={`${styles.filterTab} ${filter === 'all' ? styles.filterTabActive : ''}`}
          style={{ '--tab-color': 'var(--color-text)' } as React.CSSProperties}
          onClick={() => setFilter('all')}
        >
          <LayoutGrid size={12} aria-hidden />
          Todos
          <span className={styles.filterCount}>{products.length}</span>
        </button>

        {CATEGORY_ORDER.map((cat) => {
          const { label, Icon, color } = CATEGORY_META[cat]
          const count = products.filter((p) => p.category === cat).length
          return (
            <button
              key={cat}
              type="button"
              className={`${styles.filterTab} ${filter === cat ? styles.filterTabActive : ''}`}
              style={{ '--tab-color': color } as React.CSSProperties}
              onClick={() => setFilter(cat)}
            >
              <Icon size={12} aria-hidden />
              {label}
              <span className={styles.filterCount}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div className={styles.state}>
          <span className={styles.spinner} />
          <span className={styles.stateText}>Cargando productos...</span>
        </div>
      )}

      {/* Product grid */}
      {!loading && (
        <div className={styles.sections}>
          {CATEGORY_ORDER.map((cat) => {
            const items = grouped[cat]
            if (items.length === 0) return null
            const { label, Icon, color } = CATEGORY_META[cat]

            return (
              <section key={cat} className={styles.section}>
                <div className={styles.sectionHeader}>
                  <span
                    className={styles.sectionIcon}
                    style={{ '--cat-color': color } as React.CSSProperties}
                  >
                    <Icon size={14} strokeWidth={2} />
                  </span>
                  <h2 className={styles.sectionTitle}>{label}</h2>
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
                          !p.is_active  ? styles.cardInactive : '',
                          currentImage  ? styles.cardHasImage : '',
                        ].filter(Boolean).join(' ')}
                        style={{ '--cat-color': color } as React.CSSProperties}
                      >
                        {/* Media */}
                        <div className={styles.cardMedia}>
                          {currentImage ? (
                            <div className={styles.cardImageWrap}>
                              <img src={currentImage} alt={p.name} className={styles.cardImage} />
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

                          {currentImage && (
                            <>
                              <div className={styles.cardOverlay} />
                              <span className={styles.cardNameOverlay}>{p.name}</span>
                              <span className={styles.priceBadge}>
                                <span className={styles.priceRef}>REF</span>
                                {' '}{Number(p.price_usd).toFixed(2)}
                              </span>
                              {isUploading ? (
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
                              )}
                            </>
                          )}
                        </div>

                        {/* Hidden file input */}
                        <input
                          type="file"
                          id={`photo-${p.id}`}
                          accept="image/webp,image/jpeg,image/png"
                          className={styles.photoInput}
                          disabled={isUploading}
                          onChange={(e) => {
                            void handleUpload(p.id, e.target.files?.[0])
                            e.target.value = ''
                          }}
                        />

                        {/* Card body */}
                        <div className={styles.cardBody}>
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
                              {label}
                            </span>

                            <div className={styles.cardActions}>
                              {/* Toggle */}
                              <button
                                type="button"
                                onClick={() => void handleToggle(p.id, p.is_active)}
                                disabled={toggling === p.id}
                                aria-label={p.is_active ? 'Desactivar' : 'Activar'}
                                aria-pressed={p.is_active}
                                className={`${styles.actionBtn} ${p.is_active ? styles.toggleOn : styles.toggleOff}`}
                              >
                                {toggling === p.id
                                  ? <Loader2 size={12} className={styles.spinnerIcon} />
                                  : p.is_active
                                    ? <Eye size={13} aria-hidden />
                                    : <EyeOff size={13} aria-hidden />}
                              </button>

                              {/* Edit */}
                              <button
                                type="button"
                                aria-label={`Editar ${p.name}`}
                                className={`${styles.actionBtn} ${styles.editBtn}`}
                                onClick={() => setModal({ kind: 'edit', product: p })}
                              >
                                <Pencil size={13} aria-hidden />
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                aria-label={`Eliminar ${p.name}`}
                                className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                onClick={() => setConfirmDelete(p)}
                              >
                                <Trash2 size={13} aria-hidden />
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

          {/* Empty state when filter has no matches */}
          {filter !== 'all' && grouped[filter].length === 0 && !loading && (
            <div className={styles.emptySection}>
              <UtensilsCrossed size={32} className={styles.emptyIcon} aria-hidden />
              <span className={styles.emptyText}>Sin productos en esta categoria</span>
            </div>
          )}
        </div>
      )}

      {/* Product modal (create / edit) */}
      <AnimatePresence>
        {modal && (
          <ProductModal
            key="product-modal"
            modal={modal}
            saving={saving}
            onSave={handleSave}
            onClose={() => setModal(null)}
          />
        )}
      </AnimatePresence>

      {/* Confirm delete modal */}
      <AnimatePresence>
        {confirmDelete && (
          <ConfirmDeleteModal
            key="confirm-modal"
            product={confirmDelete}
            deleting={deleting}
            onConfirm={() => void handleDelete()}
            onCancel={() => setConfirmDelete(null)}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            className={`${styles.toast} ${toast.ok ? styles.toastOk : styles.toastErr}`}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            role="status"
            aria-live="polite"
          >
            {toast.ok
              ? <Check size={13} aria-hidden />
              : <AlertCircle size={13} aria-hidden />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}

// ── ProductModal ──────────────────────────────────────────────────────────────

interface ProductModalProps {
  modal:   ModalState
  saving:  boolean
  onSave:  (
    form: { name: string; description: string; price_usd: string; category: Category; is_active: boolean },
    photoFile: File | null,
    onErrors: (errs: FormErrors) => void,
  ) => void
  onClose: () => void
}

function ProductModal({ modal, saving, onSave, onClose }: ProductModalProps) {
  const isEdit = modal.kind === 'edit'
  const init   = isEdit
    ? {
        name:        modal.product.name,
        description: modal.product.description ?? '',
        price_usd:   String(Number(modal.product.price_usd).toFixed(2)),
        category:    modal.product.category,
        is_active:   modal.product.is_active,
      }
    : { name: '', description: '', price_usd: '', category: 'hamburguesas' as Category, is_active: true }

  const [form,       setForm]       = useState(init)
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [photoFile,  setPhotoFile]  = useState<File | null>(null)
  const [photoPrev,  setPhotoPrev]  = useState<string | null>(null)
  const fileRef                     = useRef<HTMLInputElement>(null)

  // Revoke blob URL on unmount
  useEffect(() => () => { if (photoPrev) URL.revokeObjectURL(photoPrev) }, [photoPrev])

  function handlePhotoChange(file: File | undefined) {
    if (!file) return
    if (photoPrev) URL.revokeObjectURL(photoPrev)
    const blob = URL.createObjectURL(file)
    setPhotoFile(file)
    setPhotoPrev(blob)
  }

  const currentImage = photoPrev ?? (isEdit ? modal.product.image_url : null)

  function handleSubmit() {
    onSave(form, photoFile, setFormErrors)
  }

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={styles.modal}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={SPRING}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-label={isEdit ? `Editar ${modal.product.name}` : 'Nuevo producto'}
      >
        {/* Header */}
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>
            {isEdit ? `Editar - ${modal.product.name}` : 'Nuevo producto'}
          </span>
          <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.modalBody}>

          {/* Foto */}
          <div className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>Foto (opcional)</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/webp,image/jpeg,image/png"
              className={styles.photoInput}
              onChange={(e) => handlePhotoChange(e.target.files?.[0])}
            />
            {currentImage ? (
              <div className={styles.photoPreviewWrap}>
                <img src={currentImage} alt="Vista previa" className={styles.photoPreviewImg} />
                <label
                  htmlFor="modal-photo-input"
                  className={styles.photoPreviewChange}
                  onClick={() => fileRef.current?.click()}
                >
                  <Camera size={18} aria-hidden />
                  Cambiar foto
                </label>
              </div>
            ) : (
              <div
                className={styles.photoDropZone}
                role="button"
                tabIndex={0}
                aria-label="Seleccionar foto"
                onClick={() => fileRef.current?.click()}
                onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
              >
                <ImagePlus size={24} aria-hidden />
                <span className={styles.dropText}>Seleccionar imagen</span>
              </div>
            )}
          </div>

          {/* Nombre */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="modal-name">Nombre *</label>
            <input
              id="modal-name"
              className={`${styles.input} ${formErrors.name ? styles.inputError : ''}`}
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Ej. Hamburguesa Especial"
              maxLength={100}
              autoFocus
            />
            {formErrors.name && <span className={styles.fieldError}>{formErrors.name}</span>}
          </div>

          {/* Descripcion */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="modal-desc">Descripcion</label>
            <textarea
              id="modal-desc"
              className={styles.textarea}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Ingredientes, presentacion..."
              maxLength={500}
              rows={2}
            />
          </div>

          {/* Precio + Categoria */}
          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="modal-price">Precio REF *</label>
              <input
                id="modal-price"
                type="number"
                min="0.01"
                step="0.01"
                className={`${styles.input} ${formErrors.price_usd ? styles.inputError : ''}`}
                value={form.price_usd}
                onChange={(e) => setForm((p) => ({ ...p, price_usd: e.target.value }))}
                placeholder="0.00"
              />
              {formErrors.price_usd && <span className={styles.fieldError}>{formErrors.price_usd}</span>}
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="modal-cat">Categoria *</label>
              <select
                id="modal-cat"
                className={`${styles.select} ${formErrors.category ? styles.inputError : ''}`}
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as Category }))}
              >
                <option value="hamburguesas">Hamburguesas</option>
                <option value="raciones">Raciones</option>
                <option value="bebidas">Bebidas</option>
              </select>
            </div>
          </div>

          {/* Disponible */}
          <label className={styles.toggleRow}>
            <input
              type="checkbox"
              className={styles.srOnly}
              checked={form.is_active}
              onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
            />
            <div className={`${styles.togglePill} ${form.is_active ? styles.pillOn : ''}`}>
              <div className={styles.pillThumb} />
            </div>
            <span className={styles.toggleLabel}>
              {form.is_active ? 'Producto disponible' : 'Producto no disponible'}
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnCancel} onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="button" className={styles.btnSave} onClick={handleSubmit} disabled={saving}>
            {saving
              ? <><Loader2 size={15} className={styles.spinnerIcon} /> Guardando...</>
              : isEdit ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── ConfirmDeleteModal ────────────────────────────────────────────────────────

interface ConfirmDeleteModalProps {
  product:   Product
  deleting:  boolean
  onConfirm: () => void
  onCancel:  () => void
}

function ConfirmDeleteModal({ product, deleting, onConfirm, onCancel }: ConfirmDeleteModalProps) {
  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className={styles.modal}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={SPRING}
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal
        aria-label="Confirmar eliminacion"
      >
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>Eliminar producto</span>
          <button type="button" className={styles.modalClose} onClick={onCancel} aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>

        <div className={styles.confirmBody}>
          <p className={styles.confirmTitle}>Eliminar "{product.name}"?</p>
          <p className={styles.confirmSub}>
            Esta accion no se puede deshacer. El producto sera removido del menu permanentemente.
          </p>
          <div className={styles.confirmWarning}>
            <AlertCircle size={13} aria-hidden />
            Si tiene ordenes asociadas, la eliminacion sera bloqueada.
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnCancel} onClick={onCancel} disabled={deleting}>
            Cancelar
          </button>
          <button type="button" className={styles.btnDanger} onClick={onConfirm} disabled={deleting}>
            {deleting
              ? <><Loader2 size={15} className={styles.spinnerIcon} /> Eliminando...</>
              : <><Trash2 size={15} /> Eliminar</>}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
