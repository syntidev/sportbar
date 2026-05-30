'use client'

// src/app/admin/menu/page.tsx
// Admin Menú — categorías dinámicas + badges + tabla estándar

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Check, ChevronDown, Eye, EyeOff, ImagePlus, Loader2,
  Pencil, Plus, Star, StarOff, Tag, Trash2, UtensilsCrossed, X,
} from 'lucide-react'
import styles from './page.module.css'

// ── Types ─────────────────────────────────────────────────────────────────────

type BadgeValue = 'popular' | 'nuevo' | 'promo' | 'recomendado'

interface Product {
  id:          number
  name:        string
  description: string | null
  price_usd:   string
  category:    string
  badge:       BadgeValue | null
  is_featured: boolean
  image_url:   string | null
  is_active:   boolean
}

interface CategoryStat {
  key:    string
  total:  number
  active: number
}

interface FormData {
  name:        string
  description: string
  price_usd:   string
  category:    string
  badge:       BadgeValue | ''
  is_featured: boolean
  is_active:   boolean
  imageFile:   File | null
}

type ModalMode = 'create' | 'edit'

interface ToastState { msg: string; ok: boolean }

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

const BADGE_META: Record<BadgeValue, { label: string; color: string }> = {
  popular:     { label: 'Popular',     color: 'var(--color-brand)'     },
  nuevo:       { label: 'Nuevo',       color: 'var(--color-listo)'     },
  promo:       { label: 'Promo',       color: 'var(--color-accent)'    },
  recomendado: { label: 'Recomendado', color: 'var(--color-credito)'   },
}

const BADGE_OPTIONS: BadgeValue[] = ['popular', 'nuevo', 'promo', 'recomendado']

const EMPTY_FORM: FormData = {
  name:        '',
  description: '',
  price_usd:   '',
  category:    '',
  badge:       '',
  is_featured: false,
  is_active:   true,
  imageFile:   null,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRef(usd: string | number): string {
  const n = typeof usd === 'string' ? parseFloat(usd) : usd
  return isNaN(n) ? '—' : `REF ${n.toFixed(2)}`
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminMenuPage() {
  // ── data state ──────────────────────────────────────────────────────────────
  const [products,   setProducts]   = useState<Product[]>([])
  const [categories, setCategories] = useState<CategoryStat[]>([])
  const [total,      setTotal]      = useState(0)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)

  // ── filter / pagination ─────────────────────────────────────────────────────
  const [catFilter, setCatFilter] = useState<string>('all')
  const [page,      setPage]      = useState(1)

  // ── UI state ────────────────────────────────────────────────────────────────
  const [modal,      setModal]      = useState<{ mode: ModalMode; product?: Product } | null>(null)
  const [delTarget,  setDelTarget]  = useState<Product | null>(null)
  const [toast,      setToast]      = useState<ToastState | null>(null)
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── form state ──────────────────────────────────────────────────────────────
  const [form,       setForm]       = useState<FormData>(EMPTY_FORM)
  const [formErr,    setFormErr]    = useState<string | null>(null)
  const [saving,     setSaving]     = useState(false)
  const [deleting,   setDeleting]   = useState(false)
  const [toggling,   setToggling]   = useState<number | null>(null)
  const [featuring,  setFeaturing]  = useState<number | null>(null)
  const [catOpen,    setCatOpen]    = useState(false)
  const [imgPreview, setImgPreview] = useState<string | null>(null)
  const imgRef = useRef<HTMLInputElement | null>(null)

  // ── fetch ───────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async (cat: string, pg: number) => {
    setLoading(true)
    try {
      const catQ = cat !== 'all' ? `&category=${encodeURIComponent(cat)}` : ''
      const [pRes, cRes] = await Promise.all([
        fetch(`/api/products?all=true&page=${pg}&per_page=${PAGE_SIZE}${catQ}`),
        fetch('/api/categories'),
      ])
      const [pData, cData] = await Promise.all([
        pRes.json() as Promise<{ success: boolean; products?: Product[]; total?: number; error?: string }>,
        cRes.json() as Promise<{ success: boolean; categories?: CategoryStat[] }>,
      ])
      if (!pData.success) throw new Error(pData.error)
      setProducts(pData.products ?? [])
      setTotal(pData.total ?? 0)
      if (cData.success) setCategories(cData.categories ?? [])
      setError(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchAll(catFilter, page) }, [fetchAll, catFilter, page])

  // ── toast ───────────────────────────────────────────────────────────────────

  const showToast = useCallback((msg: string, ok = true) => {
    if (toastRef.current) clearTimeout(toastRef.current)
    setToast({ msg, ok })
    toastRef.current = setTimeout(() => setToast(null), 3000)
  }, [])

  // ── open modal ──────────────────────────────────────────────────────────────

  function openCreate() {
    setForm({ ...EMPTY_FORM, category: catFilter !== 'all' ? catFilter : '' })
    setFormErr(null)
    setImgPreview(null)
    setModal({ mode: 'create' })
  }

  function openEdit(p: Product) {
    setForm({
      name:        p.name,
      description: p.description ?? '',
      price_usd:   p.price_usd,
      category:    p.category,
      badge:       p.badge ?? '',
      is_featured: p.is_featured,
      is_active:   p.is_active,
      imageFile:   null,
    })
    setFormErr(null)
    setImgPreview(p.image_url)
    setModal({ mode: 'edit', product: p })
  }

  function closeModal() {
    setModal(null)
    if (imgPreview && imgPreview.startsWith('blob:')) URL.revokeObjectURL(imgPreview)
    setImgPreview(null)
  }

  // ── image pick ──────────────────────────────────────────────────────────────

  function handleImgPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setFormErr('La imagen no puede superar 5 MB'); return }
    if (imgPreview?.startsWith('blob:')) URL.revokeObjectURL(imgPreview)
    setImgPreview(URL.createObjectURL(file))
    setForm((prev) => ({ ...prev, imageFile: file }))
  }

  // ── save ─────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!modal) return
    setFormErr(null)

    const name = form.name.trim()
    const cat  = form.category.trim()
    const price = parseFloat(form.price_usd)

    if (!name)       { setFormErr('Nombre requerido'); return }
    if (!cat)        { setFormErr('Categoría requerida'); return }
    if (!form.price_usd || isNaN(price) || price <= 0) { setFormErr('Precio inválido'); return }

    setSaving(true)
    try {
      const payload = {
        name,
        description: form.description.trim() || null,
        price_usd:   price,
        category:    cat,
        badge:       form.badge || null,
        is_featured: form.is_featured,
        is_active:   form.is_active,
      }

      let savedProduct: Product

      if (modal.mode === 'create') {
        const res  = await fetch('/api/products', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        })
        const data = await res.json() as { success: boolean; product?: Product; error?: string }
        if (!data.success || !data.product) throw new Error(data.error ?? 'Error al crear')
        savedProduct = data.product
      } else {
        const pid = modal.product!.id
        const res  = await fetch(`/api/products/${pid}`, {
          method:  'PUT',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        })
        const data = await res.json() as { success: boolean; product?: Product; error?: string }
        if (!data.success || !data.product) throw new Error(data.error ?? 'Error al guardar')
        savedProduct = data.product
      }

      // upload image if selected
      let imgError: string | null = null
      if (form.imageFile) {
        const fd = new FormData()
        fd.append('file', form.imageFile)
        const upRes  = await fetch(`/api/products/${savedProduct.id}/upload`, { method: 'POST', body: fd })
        const upData = await upRes.json() as { success: boolean; image_url?: string; error?: string }
        if (upData.success && upData.image_url) {
          savedProduct = { ...savedProduct, image_url: upData.image_url }
        } else {
          imgError = upData.error ?? 'Error al subir la foto'
        }
      }

      if (modal.mode === 'create') {
        setProducts((prev) => [savedProduct, ...prev])
        setTotal((t) => t + 1)
      } else {
        setProducts((prev) => prev.map((p) => p.id === savedProduct.id ? savedProduct : p))
      }

      // refresh categories
      const cRes  = await fetch('/api/categories')
      const cData = await cRes.json() as { success: boolean; categories?: CategoryStat[] }
      if (cData.success) setCategories(cData.categories ?? [])

      closeModal()
      if (imgError) {
        showToast(`Producto guardado · ${imgError}`, false)
      } else {
        showToast(modal.mode === 'create' ? 'Producto creado' : 'Producto actualizado')
      }
    } catch (e: unknown) {
      setFormErr(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  // ── toggle active ────────────────────────────────────────────────────────────

  async function handleToggleActive(p: Product) {
    if (toggling === p.id) return
    setToggling(p.id)
    try {
      const res  = await fetch(`/api/products/${p.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ is_active: !p.is_active }),
      })
      const data = await res.json() as { success: boolean; error?: string }
      if (!data.success) throw new Error(data.error)
      setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, is_active: !p.is_active } : x))
      showToast(p.is_active ? 'Desactivado' : 'Activado')
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error', false)
    } finally {
      setToggling(null)
    }
  }

  // ── toggle featured ──────────────────────────────────────────────────────────

  async function handleToggleFeatured(p: Product) {
    if (featuring === p.id) return
    setFeaturing(p.id)
    try {
      const res  = await fetch(`/api/products/${p.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ is_featured: !p.is_featured }),
      })
      const data = await res.json() as { success: boolean; error?: string }
      if (!data.success) throw new Error(data.error)
      setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, is_featured: !p.is_featured } : x))
      showToast(p.is_featured ? 'Quitado de destacados' : 'Marcado como destacado')
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error', false)
    } finally {
      setFeaturing(null)
    }
  }

  // ── delete ───────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!delTarget) return
    setDeleting(true)
    try {
      const res  = await fetch(`/api/products/${delTarget.id}`, { method: 'DELETE' })
      const data = await res.json() as { success: boolean; error?: string }
      if (!data.success) throw new Error(data.error)
      setProducts((prev) => prev.filter((p) => p.id !== delTarget.id))
      setTotal((t) => Math.max(0, t - 1))
      const cRes  = await fetch('/api/categories')
      const cData = await cRes.json() as { success: boolean; categories?: CategoryStat[] }
      if (cData.success) setCategories(cData.categories ?? [])
      setDelTarget(null)
      showToast(`"${delTarget.name}" eliminado`)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error al eliminar', false)
    } finally {
      setDeleting(false)
    }
  }

  // ── pagination ───────────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function changePage(p: number) {
    if (p < 1 || p > totalPages) return
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function changeCat(cat: string) {
    setCatFilter(cat)
    setPage(1)
  }

  // ── render ───────────────────────────────────────────────────────────────────

  const allCount = categories.reduce((s, c) => s + c.total, 0)

  return (
    <div className={styles.page}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Menú</h1>
          <p className={styles.subtitle}>{allCount} productos · {categories.length} categorías</p>
        </div>
        <button type="button" className={styles.btnPrimary} onClick={openCreate}>
          <Plus size={16} aria-hidden />
          Nuevo producto
        </button>
      </header>

      {/* ── Error ───────────────────────────────────────────────────────────── */}
      {error && (
        <div className={styles.errorBanner} role="alert">{error}</div>
      )}

      {/* ── Category tabs ───────────────────────────────────────────────────── */}
      <div className={styles.tabs} role="tablist" aria-label="Filtrar por categoría">
        <button
          role="tab"
          aria-selected={catFilter === 'all'}
          className={`${styles.tab} ${catFilter === 'all' ? styles.tabActive : ''}`}
          onClick={() => changeCat('all')}
        >
          <UtensilsCrossed size={13} aria-hidden />
          Todos
          <span className={styles.tabCount}>{allCount}</span>
        </button>
        {categories.map((c) => (
          <button
            key={c.key}
            role="tab"
            aria-selected={catFilter === c.key}
            className={`${styles.tab} ${catFilter === c.key ? styles.tabActive : ''}`}
            onClick={() => changeCat(c.key)}
          >
            {c.key}
            <span className={styles.tabCount}>{c.total}</span>
          </button>
        ))}
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className={styles.splash}>
          <Loader2 size={28} className={styles.spin} aria-hidden />
          <span>Cargando…</span>
        </div>
      ) : products.length === 0 ? (
        <div className={styles.splash}>
          <UtensilsCrossed size={48} strokeWidth={1} aria-hidden />
          <span>Sin productos en esta categoría</span>
          <button type="button" className={styles.btnPrimary} onClick={openCreate}>
            <Plus size={15} aria-hidden /> Agregar producto
          </button>
        </div>
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.thImg}>Foto</th>
                  <th>Nombre</th>
                  <th className={styles.thCat}>Categoría</th>
                  <th className={styles.thPrice}>Precio</th>
                  <th className={styles.thBadge}>Badge</th>
                  <th className={styles.thToggle}>Activo</th>
                  <th className={styles.thToggle}>Dest.</th>
                  <th className={styles.thActions}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className={!p.is_active ? styles.rowInactive : ''}>

                    {/* Thumbnail */}
                    <td className={styles.tdImg}>
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className={styles.thumb} loading="lazy" />
                      ) : (
                        <div className={styles.thumbPlaceholder}>
                          <ImagePlus size={16} aria-hidden />
                        </div>
                      )}
                    </td>

                    {/* Name + description */}
                    <td>
                      <div className={styles.prodName}>{p.name}</div>
                      {p.description && (
                        <div className={styles.prodDesc}>{p.description}</div>
                      )}
                    </td>

                    {/* Category */}
                    <td className={styles.tdCat}>
                      <span className={styles.catPill}>{p.category}</span>
                    </td>

                    {/* Price */}
                    <td className={styles.tdPrice}>{formatRef(p.price_usd)}</td>

                    {/* Badge */}
                    <td className={styles.tdBadge}>
                      {p.badge ? (
                        <span
                          className={styles.badgePill}
                          style={{ '--badge-color': BADGE_META[p.badge].color } as React.CSSProperties}
                        >
                          {BADGE_META[p.badge].label}
                        </span>
                      ) : (
                        <span className={styles.noBadge}>—</span>
                      )}
                    </td>

                    {/* Toggle active */}
                    <td className={styles.tdToggle}>
                      <button
                        type="button"
                        className={`${styles.toggleBtn} ${p.is_active ? styles.toggleOn : styles.toggleOff}`}
                        onClick={() => handleToggleActive(p)}
                        disabled={toggling === p.id}
                        aria-label={p.is_active ? 'Desactivar' : 'Activar'}
                      >
                        {toggling === p.id
                          ? <Loader2 size={13} className={styles.spin} aria-hidden />
                          : p.is_active ? <Eye size={13} aria-hidden /> : <EyeOff size={13} aria-hidden />
                        }
                      </button>
                    </td>

                    {/* Toggle featured */}
                    <td className={styles.tdToggle}>
                      <button
                        type="button"
                        className={`${styles.toggleBtn} ${p.is_featured ? styles.toggleFeatured : styles.toggleOff}`}
                        onClick={() => handleToggleFeatured(p)}
                        disabled={featuring === p.id}
                        aria-label={p.is_featured ? 'Quitar destacado' : 'Marcar destacado'}
                      >
                        {featuring === p.id
                          ? <Loader2 size={13} className={styles.spin} aria-hidden />
                          : p.is_featured ? <Star size={13} aria-hidden /> : <StarOff size={13} aria-hidden />
                        }
                      </button>
                    </td>

                    {/* Actions */}
                    <td className={styles.tdActions}>
                      <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={() => openEdit(p)}
                        aria-label={`Editar ${p.name}`}
                      >
                        <Pencil size={15} aria-hidden />
                      </button>
                      <button
                        type="button"
                        className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                        onClick={() => setDelTarget(p)}
                        aria-label={`Eliminar ${p.name}`}
                      >
                        <Trash2 size={15} aria-hidden />
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ──────────────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                type="button"
                className={styles.pageBtn}
                onClick={() => changePage(page - 1)}
                disabled={page === 1}
              >
                ‹
              </button>
              <span className={styles.pageInfo}>Pág. {page} / {totalPages}</span>
              <button
                type="button"
                className={styles.pageBtn}
                onClick={() => changePage(page + 1)}
                disabled={page === totalPages}
              >
                ›
              </button>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          Create / Edit Modal
      ════════════════════════════════════════════════════════════════════════ */}
      {modal && (
        <div className={styles.overlay} onClick={closeModal} role="dialog" aria-modal aria-label={modal.mode === 'create' ? 'Nuevo producto' : 'Editar producto'}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>

            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>
                {modal.mode === 'create' ? 'Nuevo producto' : `Editar · ${modal.product?.name}`}
              </span>
              <button type="button" className={styles.closeBtn} onClick={closeModal} aria-label="Cerrar">
                <X size={18} aria-hidden />
              </button>
            </div>

            <div className={styles.modalBody}>

              {/* Image upload */}
              <div className={styles.imgUploadArea}>
                <div
                  className={styles.imgPreviewBox}
                  onClick={() => imgRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && imgRef.current?.click()}
                  aria-label="Seleccionar imagen"
                >
                  {imgPreview ? (
                    <img src={imgPreview} alt="Preview" className={styles.imgPreview} />
                  ) : (
                    <div className={styles.imgPlaceholder}>
                      <ImagePlus size={28} aria-hidden />
                      <span>Foto del producto</span>
                    </div>
                  )}
                </div>
                <input
                  ref={imgRef}
                  type="file"
                  accept="image/*"
                  className={styles.fileInput}
                  onChange={handleImgPick}
                  aria-label="Subir imagen"
                />
              </div>

              {/* Name */}
              <label className={styles.fieldLabel}>
                Nombre *
                <input
                  type="text"
                  className={styles.input}
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej. Hamburguesa Clásica"
                  maxLength={100}
                  autoFocus
                />
              </label>

              {/* Description */}
              <label className={styles.fieldLabel}>
                Descripción
                <textarea
                  className={`${styles.input} ${styles.textarea}`}
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Opcional — ingredientes, presentación…"
                  rows={2}
                  maxLength={500}
                />
              </label>

              {/* Price + Category row */}
              <div className={styles.row2}>
                <label className={styles.fieldLabel}>
                  Precio REF *
                  <input
                    type="number"
                    className={styles.input}
                    value={form.price_usd}
                    onChange={(e) => setForm((prev) => ({ ...prev, price_usd: e.target.value }))}
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                  />
                </label>

                {/* Category — free text + suggestions dropdown */}
                <label className={styles.fieldLabel}>
                  Categoría *
                  <div className={styles.catInputWrap}>
                    <input
                      type="text"
                      className={styles.input}
                      value={form.category}
                      onChange={(e) => { setForm((prev) => ({ ...prev, category: e.target.value })); setCatOpen(true) }}
                      onFocus={() => setCatOpen(true)}
                      onBlur={() => setTimeout(() => setCatOpen(false), 150)}
                      placeholder="hamburguesas, bebidas…"
                      maxLength={60}
                    />
                    <button
                      type="button"
                      className={styles.catToggle}
                      onMouseDown={(e) => { e.preventDefault(); setCatOpen((o) => !o) }}
                      aria-label="Ver categorías"
                    >
                      <ChevronDown size={14} aria-hidden />
                    </button>
                    {catOpen && categories.length > 0 && (
                      <ul className={styles.catDropdown}>
                        {categories.map((c) => (
                          <li key={c.key}>
                            <button
                              type="button"
                              className={`${styles.catOption} ${form.category === c.key ? styles.catOptionActive : ''}`}
                              onMouseDown={() => { setForm((prev) => ({ ...prev, category: c.key })); setCatOpen(false) }}
                            >
                              <Tag size={11} aria-hidden />
                              {c.key}
                              <span className={styles.catOptionCount}>{c.total}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </label>
              </div>

              {/* Badge select */}
              <label className={styles.fieldLabel}>
                Badge
                <div className={styles.badgeOptions}>
                  <button
                    type="button"
                    className={`${styles.badgeOpt} ${form.badge === '' ? styles.badgeOptActive : ''}`}
                    onClick={() => setForm((prev) => ({ ...prev, badge: '' }))}
                  >
                    Sin badge
                  </button>
                  {BADGE_OPTIONS.map((b) => (
                    <button
                      key={b}
                      type="button"
                      className={`${styles.badgeOpt} ${form.badge === b ? styles.badgeOptActive : ''}`}
                      style={form.badge === b ? { '--badge-color': BADGE_META[b].color } as React.CSSProperties : undefined}
                      onClick={() => setForm((prev) => ({ ...prev, badge: b }))}
                    >
                      {BADGE_META[b].label}
                    </button>
                  ))}
                </div>
              </label>

              {/* Toggles row */}
              <div className={styles.toggleRow}>
                <button
                  type="button"
                  className={`${styles.toggleSwitch} ${form.is_active ? styles.switchOn : ''}`}
                  onClick={() => setForm((prev) => ({ ...prev, is_active: !prev.is_active }))}
                  aria-pressed={form.is_active}
                >
                  <span className={styles.switchKnob} />
                  <span className={styles.switchLabel}>{form.is_active ? 'Activo' : 'Inactivo'}</span>
                </button>

                <button
                  type="button"
                  className={`${styles.toggleSwitch} ${form.is_featured ? styles.switchFeatured : ''}`}
                  onClick={() => setForm((prev) => ({ ...prev, is_featured: !prev.is_featured }))}
                  aria-pressed={form.is_featured}
                >
                  <span className={styles.switchKnob} />
                  <span className={styles.switchLabel}>{form.is_featured ? 'Destacado ★' : 'No destacado'}</span>
                </button>
              </div>

              {/* Error */}
              {formErr && (
                <p className={styles.formError} role="alert">{formErr}</p>
              )}

            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnSecondary} onClick={closeModal} disabled={saving}>
                Cancelar
              </button>
              <button type="button" className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 size={15} className={styles.spin} aria-hidden /> : <Check size={15} aria-hidden />}
                {saving ? 'Guardando…' : modal.mode === 'create' ? 'Crear producto' : 'Guardar cambios'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          Confirm Delete
      ════════════════════════════════════════════════════════════════════════ */}
      {delTarget && (
        <div className={styles.overlay} onClick={() => setDelTarget(null)} role="dialog" aria-modal aria-label="Confirmar eliminación">
          <div className={`${styles.modalBox} ${styles.confirmBox}`} onClick={(e) => e.stopPropagation()}>
            <p className={styles.confirmMsg}>
              Eliminar <strong>{delTarget.name}</strong>?<br />
              <span className={styles.confirmSub}>Esta acción no se puede deshacer.</span>
            </p>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnSecondary} onClick={() => setDelTarget(null)} disabled={deleting}>
                Cancelar
              </button>
              <button type="button" className={styles.btnDanger} onClick={handleDelete} disabled={deleting}>
                {deleting ? <Loader2 size={15} className={styles.spin} aria-hidden /> : <Trash2 size={15} aria-hidden />}
                {deleting ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ───────────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`${styles.toast} ${toast.ok ? styles.toastOk : styles.toastErr}`} role="status">
          {toast.ok ? <Check size={14} aria-hidden /> : <X size={14} aria-hidden />}
          {toast.msg}
        </div>
      )}

    </div>
  )
}
