"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  ArrowLeft, ShoppingCart, Beef, Utensils, Coffee,
  Plus, Minus, Pencil, CheckCircle2, User, MapPin, ChevronRight, X, Info,
} from "lucide-react";
import Link from "next/link";
import { formatRef, formatBs } from "@/lib/dollar-rate";
import type { Zone } from "@/types";
import styles from "./page.module.css";

type Category = "hamburguesas" | "raciones" | "bebidas";

interface Product {
  id: number;
  name: string;
  price_usd: number;
  category: string;
}

interface CartItem {
  product: Product;
  qty: number;
}

const ZONES: Zone[] = ["Norte", "Sur", "VIP", "Externa"];

const CATEGORIES: { key: Category; label: string; iconClass: string }[] = [
  { key: "hamburguesas", label: "Hamburguesas", iconClass: "hbg" },
  { key: "raciones",     label: "Raciones",     iconClass: "rac" },
  { key: "bebidas",      label: "Bebidas",       iconClass: "beb" },
];

const CAT_ICON_CLASS: Record<Category, string> = {
  hamburguesas: styles.hbg,
  raciones:     styles.rac,
  bebidas:      styles.beb,
};

const STEP_LABELS = ["Categoría", "Productos", "Resumen", "Cliente"];

const slideVariants: Variants = {
  enter:  (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.28, ease: [0.25, 0, 0, 1] } },
  exit:   (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0, transition: { duration: 0.22, ease: [0.25, 0, 0, 1] } }),
};

const sheetVariants: Variants = {
  hidden:  { y: "100%" },
  visible: { y: 0, transition: { type: "spring", damping: 32, stiffness: 300 } },
  exit:    { y: "100%", transition: { duration: 0.22, ease: [0.25, 0, 0, 1] } },
};

export default function NuevaOrdenPage() {
  const [step,       setStep]       = useState(0);
  const [direction,  setDirection]  = useState(1);
  const [category,   setCategory]   = useState<Category | null>(null);
  const [products,   setProducts]   = useState<Product[]>([]);
  const [cart,       setCart]       = useState<Map<number, CartItem>>(new Map());
  const [rate,       setRate]       = useState(50.0);
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [userId,     setUserId]     = useState<number | null>(null);
  const [sheetOpen,  setSheetOpen]  = useState(false);

  const [form, setForm] = useState({
    zone:   "" as Zone | "",
    seat:   "",
    name:   "",
    cedula: "",
    note:   "",
  });

  const [showZoneTooltip, setShowZoneTooltip] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const [prodRes, rateRes, meRes] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/currency"),
          fetch("/api/auth/me"),
        ]);
        const [prodData, rateData, meData] = await Promise.all([
          prodRes.json(), rateRes.json(), meRes.json(),
        ]);
        if (prodData.success)  setProducts(prodData.products);
        if (rateData.rate)     setRate(rateData.rate);
        if (meData.success)    setUserId(meData.user.id);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  function goStep(next: number) {
    setDirection(next > step ? 1 : -1);
    setStep(next);
    setSheetOpen(false);
  }

  function adjustQty(product: Product, delta: number) {
    setCart((prev) => {
      const next = new Map(prev);
      const current = next.get(product.id);
      const qty = (current?.qty ?? 0) + delta;
      if (qty <= 0) next.delete(product.id);
      else next.set(product.id, { product, qty });
      return next;
    });
  }

  function getQty(id: number) { return cart.get(id)?.qty ?? 0; }

  const cartItems  = Array.from(cart.values());
  const cartCount  = cartItems.reduce((s, i) => s + i.qty, 0);
  const totalUsd   = cartItems.reduce((s, i) => s + i.product.price_usd * i.qty, 0);
  const totalBs    = Math.round(totalUsd * rate * 100) / 100;
  const filtered   = products.filter((p) => p.category === category);

  async function handleSubmit() {
    if (!userId || !form.zone || !form.name.trim()) return;
    if (form.zone === "VIP" && !form.cedula.trim()) {
      setError("Cédula requerida para zona VIP");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin:        "LOC",
          created_by:    userId,
          customer_name: form.name.trim(),
          customer_id:   form.cedula.trim() || undefined,
          zone:              form.zone,
          seat:              form.seat.trim() || undefined,
          note:              form.note.trim() || undefined,
          items: cartItems.map((i) => ({
            product_id: i.product.id,
            qty:        i.qty,
            price_usd:  i.product.price_usd,
          })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = "/pos";
      } else {
        setError(Array.isArray(data.errors) ? data.errors[0] : (data.error ?? "Error al crear orden"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const canNext1 = cartCount > 0;
  const canNext3 =
    form.zone !== "" &&
    form.name.trim() !== "" &&
    (form.zone !== "VIP" || form.cedula.trim() !== "");

  if (loading) {
    return (
      <div className={styles.page} style={{ alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: "0.82rem", color: "var(--color-text-muted)" }}>Cargando...</span>
      </div>
    );
  }

  const showFab = cartCount > 0 && step <= 1;

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <header className={styles.header}>
        {step > 0 ? (
          <button className={styles.backBtn} onClick={() => goStep(step - 1)}>
            <ArrowLeft size={16} />
          </button>
        ) : (
          <Link href="/pos" className={styles.backBtn}>
            <ArrowLeft size={16} />
          </Link>
        )}
        <div className={styles.headerInfo}>
          <span className={styles.headerTitle}>Nueva Orden</span>
          <span className={styles.headerSub}>{STEP_LABELS[step]}</span>
        </div>
        {cartCount > 0 && (
          <span className={styles.cartPill}>
            <ShoppingCart size={12} />
            {cartCount}
          </span>
        )}
      </header>

      {/* ── Progress bar ── */}
      <div className={styles.progressWrap} aria-label={`Paso ${step + 1} de 4`}>
        <div className={styles.progressTrack}>
          <motion.div
            className={styles.progressFill}
            animate={{ width: `${((step + 1) / 4) * 100}%` }}
            transition={{ duration: 0.35, ease: [0.25, 0, 0, 1] }}
          />
        </div>
        <span className={styles.progressLabel}>Paso {step + 1} de 4</span>
      </div>

      {/* ── Steps ── */}
      <div className={styles.stepWrap}>
        <AnimatePresence custom={direction} mode="popLayout">

          {/* Step 0 — Categories */}
          {step === 0 && (
            <motion.div key="s0" className={styles.step} custom={direction}
              variants={slideVariants} initial="enter" animate="center" exit="exit">
              <div className={styles.categoryGrid}>
                {CATEGORIES.map((cat) => {
                  const count = products.filter((p) => p.category === cat.key).length;
                  return (
                    <button
                      key={cat.key}
                      className={styles.categoryCard}
                      onClick={() => { setCategory(cat.key); goStep(1); }}
                    >
                      <div className={`${styles.catIcon} ${CAT_ICON_CLASS[cat.key]}`}>
                        {cat.key === "hamburguesas" && <Beef     size={24} />}
                        {cat.key === "raciones"     && <Utensils size={24} />}
                        {cat.key === "bebidas"      && <Coffee   size={24} />}
                      </div>
                      <div className={styles.catBody}>
                        <span className={styles.catLabel}>{cat.label}</span>
                        <span className={styles.catCount}>
                          {count} producto{count !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Step 1 — Products */}
          {step === 1 && (
            <motion.div key="s1" className={`${styles.step} ${styles.stepProducts}`}
              custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit">
              <span className={styles.stepLabel}>{category}</span>
              <div className={styles.productList}>
                {filtered.map((product) => {
                  const qty = getQty(product.id);
                  return (
                    <div key={product.id} className={`${styles.productCard} ${qty > 0 ? styles.inCart : ""}`}>
                      <div className={styles.productInfo}>
                        <span className={styles.productName}>{product.name}</span>
                        <span className={styles.productPrice}>{formatRef(product.price_usd)}</span>
                      </div>
                      <div className={styles.qtyControl}>
                        {qty > 0 && (
                          <>
                            <button className={styles.qtyBtn} onClick={() => adjustQty(product, -1)}
                              aria-label={`Quitar ${product.name}`}>
                              <Minus size={16} />
                            </button>
                            <span className={styles.qtyNum}>{qty}</span>
                          </>
                        )}
                        <button
                          className={`${styles.qtyBtn} ${styles.qtyBtnAdd}`}
                          onClick={() => adjustQty(product, 1)}
                          aria-label={`Agregar ${product.name}`}
                        >
                          <Plus size={20} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Step 2 — Summary */}
          {step === 2 && (
            <motion.div key="s2" className={styles.step} custom={direction}
              variants={slideVariants} initial="enter" animate="center" exit="exit">
              <span className={styles.stepLabel}>Resumen</span>
              <div className={styles.summaryCard}>
                <div className={styles.summaryItems}>
                  {cartItems.map(({ product, qty }) => (
                    <div key={product.id} className={styles.summaryItem}>
                      <div className={styles.summaryItemLeft}>
                        <span className={styles.summaryQty}>{qty}×</span>
                        <span className={styles.summaryName}>{product.name}</span>
                      </div>
                      <span className={styles.summaryPrice}>{formatRef(product.price_usd * qty)}</span>
                    </div>
                  ))}
                </div>
                <div className={styles.summaryTotals}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span className={styles.totalRef}>{formatRef(totalUsd)}</span>
                    <span className={styles.totalBs}>{formatBs(totalBs)}</span>
                  </div>
                  <button className={styles.editCartBtn} onClick={() => goStep(1)}>
                    <Pencil size={13} />
                    Editar
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3 — Customer */}
          {step === 3 && (
            <motion.div key="s3" className={styles.step} custom={direction}
              variants={slideVariants} initial="enter" animate="center" exit="exit">
              <div className={styles.formGroup}>
                <div className={styles.zoneLabelRow}>
                  <span className={styles.stepLabel}>
                    Zona <span className={styles.fieldRequired}>*</span>
                  </span>
                  <button
                    type="button"
                    className={styles.infoBtn}
                    onClick={() => setShowZoneTooltip((v) => !v)}
                    aria-label="Información sobre zona"
                  >
                    <Info size={13} />
                  </button>
                </div>
                {showZoneTooltip && (
                  <p className={styles.zoneTooltip}>
                    Tu zona aparece impresa en tu ticket de entrada
                  </p>
                )}
                <div className={styles.zoneGrid}>
                  {ZONES.map((z) => (
                    <button
                      key={z}
                      className={`${styles.zoneBtn} ${form.zone === z ? styles.selected : ""}`}
                      onClick={() => setForm((f) => ({ ...f, zone: z }))}
                    >
                      {z}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>
                  <MapPin size={10} style={{ display: "inline", marginRight: 4 }} />
                  Asiento / Mesa
                </label>
                <input
                  className={styles.input}
                  placeholder="Ej: Mesa 4, Silla 2..."
                  value={form.seat}
                  onChange={(e) => setForm((f) => ({ ...f, seat: e.target.value }))}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>
                  Nombre <span className={styles.fieldRequired}>*</span>
                </label>
                <input
                  className={styles.input}
                  placeholder="Nombre o nombre completo"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>
                  Cédula
                  {form.zone === "VIP" && <span className={styles.fieldRequired}> *</span>}
                </label>
                <input
                  className={styles.input}
                  placeholder="V-12345678"
                  value={form.cedula}
                  onChange={(e) => setForm((f) => ({ ...f, cedula: e.target.value }))}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>Nota</label>
                <input
                  className={styles.input}
                  placeholder="Sin cebolla, extra salsa..."
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                />
              </div>

              {error && <div className={styles.errorMsg}>{error}</div>}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── Action bar ── */}
      <div className={styles.actionBar}>
        {step === 0 && null}

        {step === 1 && (
          <button
            className={`${styles.btnPrimary} ${styles.btnBrand}`}
            disabled={!canNext1}
            onClick={() => goStep(2)}
          >
            Ver resumen · {cartCount} ítem{cartCount !== 1 ? "s" : ""}
            <ChevronRight size={18} />
          </button>
        )}

        {step === 2 && (
          <button className={styles.btnPrimary} onClick={() => goStep(3)}>
            <User size={16} />
            Datos del cliente
          </button>
        )}

        {step === 3 && (
          <button
            className={`${styles.btnPrimary} ${styles.btnConfirm}`}
            disabled={!canNext3 || submitting}
            onClick={handleSubmit}
          >
            <CheckCircle2 size={18} />
            {submitting ? "Enviando..." : "Confirmar orden"}
          </button>
        )}
      </div>

      {/* ── Floating cart button (steps 0–1) ── */}
      <AnimatePresence>
        {showFab && (
          <motion.button
            className={styles.cartFab}
            onClick={() => setSheetOpen(true)}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            aria-label={`Ver carrito — ${cartCount} items`}
          >
            <ShoppingCart size={20} />
            <span className={styles.fabBadge}>{cartCount}</span>
            <span className={styles.fabTotal}>{formatRef(totalUsd)}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Cart bottom sheet ── */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              className={styles.sheetOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSheetOpen(false)}
              aria-hidden
            />
            <motion.div
              className={styles.sheet}
              role="dialog"
              aria-label="Resumen del carrito"
              aria-modal="true"
              variants={sheetVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {/* Handle */}
              <div className={styles.sheetHandle} />

              {/* Title row */}
              <div className={styles.sheetTitleRow}>
                <span className={styles.sheetTitle}>
                  <ShoppingCart size={16} aria-hidden />
                  Carrito · {cartCount} ítem{cartCount !== 1 ? "s" : ""}
                </span>
                <button
                  className={styles.sheetClose}
                  onClick={() => setSheetOpen(false)}
                  aria-label="Cerrar carrito"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Items */}
              <div className={styles.sheetContent}>
                {cartItems.map(({ product, qty }) => (
                  <div key={product.id} className={styles.sheetItem}>
                    <div className={styles.sheetItemLeft}>
                      <span className={styles.sheetItemQty}>{qty}×</span>
                      <span className={styles.sheetItemName}>{product.name}</span>
                    </div>
                    <span className={styles.sheetItemPrice}>
                      {formatRef(product.price_usd * qty)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className={styles.sheetTotals}>
                <div className={styles.sheetTotalRow}>
                  <span className={styles.sheetTotalLabel}>Total</span>
                  <div className={styles.sheetTotalAmounts}>
                    <span className={styles.sheetTotalRef}>{formatRef(totalUsd)}</span>
                    <span className={styles.sheetTotalBs}>{formatBs(totalBs)}</span>
                  </div>
                </div>
                <button
                  className={styles.sheetContinue}
                  onClick={() => goStep(2)}
                >
                  <CheckCircle2 size={18} />
                  Continuar al resumen
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
