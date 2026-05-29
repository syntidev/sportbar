'use client'

import { Utensils, Beer, Flame, Eye, EyeOff } from 'lucide-react'
import type { Product, Category } from '@/types'
import styles from './ProductCard.module.css'

// ── Category metadata ─────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<Category, { label: string; Icon: React.ElementType }> = {
  hamburguesas: { label: 'Hamburguesas', Icon: Flame },
  raciones: { label: 'Raciones', Icon: Utensils },
  bebidas: { label: 'Bebidas', Icon: Beer },
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ProductCardProps {
  product: Product
  onToggleActive: (id: number, current: boolean) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProductCard({ product, onToggleActive }: ProductCardProps) {
  const { label, Icon } = CATEGORY_CONFIG[product.category]

  const formattedPrice = Number(product.price_usd).toFixed(2)

  function handleToggle() {
    onToggleActive(product.id, product.is_active)
  }

  return (
    <article className={`${styles.card} ${!product.is_active ? styles.inactive : ''}`}>
      {/* Header: name + active toggle */}
      <header className={styles.header}>
        <h3 className={styles.name}>{product.name}</h3>

        <button
          type="button"
          onClick={handleToggle}
          aria-label={product.is_active ? 'Desactivar producto' : 'Activar producto'}
          aria-pressed={product.is_active}
          className={`${styles.toggle} ${product.is_active ? styles.toggleOn : styles.toggleOff}`}
        >
          {product.is_active ? (
            <Eye size={16} aria-hidden />
          ) : (
            <EyeOff size={16} aria-hidden />
          )}
          <span className={styles.toggleLabel}>
            {product.is_active ? 'Activo' : 'Inactivo'}
          </span>
        </button>
      </header>

      {/* Description */}
      {product.description && (
        <p className={styles.description}>{product.description}</p>
      )}

      {/* Footer: category badge + price */}
      <footer className={styles.footer}>
        <span className={`${styles.badge} ${styles[`badge_${product.category}`]}`}>
          <Icon size={12} aria-hidden />
          {label}
        </span>

        <span className={styles.price}>
          <span className={styles.priceSymbol}>REF</span>
          {formattedPrice}
        </span>
      </footer>
    </article>
  )
}
