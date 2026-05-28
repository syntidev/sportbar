"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { UtensilsCrossed, Wine, Beef, X, ShoppingBag, Check } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { formatBs } from "@/lib/dollar-rate";
import styles from "./page.module.css";

type Category = "hamburguesas" | "raciones" | "bebidas";
type Zone     = "Norte" | "Sur" | "VIP" | "Externa";

interface Product {
  id:          number;
  name:        string;
  description: string | null;
  price_usd:   string;
  category:    Category;
  image_url:   string | null;
}

interface TurnoData {
  is_active:      boolean;
  partido_nombre: string;
}

const CATS: { key: Category; label: string; Icon: typeof Beef }[] = [
  { key: "hamburguesas", label: "Hamburguesas", Icon: Beef            },
  { key: "raciones",     label: "Raciones",     Icon: UtensilsCrossed },
  { key: "bebidas",      label: "Bebidas",       Icon: Wine            },
];

const ZONES: Zone[] = ["Norte", "Sur", "VIP", "Externa"];

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0, 0, 1] } },
};

const sheetVariants: Variants = {
  hidden:  { y: "100%" },
  visible: { y: 0, transition: { type: "spring", damping: 30, stiffness: 300 } },
  exit:    { y: "100%", transition: { duration: 0.22, ease: [0.25, 0, 0, 1] } },
};

export default function MenuPublicoPage() {
  const [turno,     setTurno]     = useState<TurnoData | null>(null);
  const [products,  setProducts]  = useState<Product[]>([]);
  const [rate,      setRate]      = useState(50.0);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<Category>("hamburguesas");

  // Modal state
  const [modal,      setModal]      = useState<Product | null>(null);
  const [submitted,  setSubmitted]  = useState(false);
  const [orderCode,  setOrderCode]  = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError,  setFormError]  = useState<string | null>(null);

  const [form, setForm] = useState({
    qty:      1,
    zone:     "" as Zone | "",
    seat:     "",
    name:     "",
    lastname: "",
    cedula:   "",
  });

  const sectionRefs = useRef<Partial<Record<Category, HTMLElement>>>({});

  // ── Bootstrap ──
  useEffect(() => {
    async function init() {
      try {
        const [turnoRes, rateRes] = await Promise.all([
          fetch("/api/turno"),
          fetch("/api/currency"),
        ]);
        const [turnoData, rateData] = await Promise.all([
          turnoRes.json(), rateRes.json(),
        ]);

        if (turnoData.success) {
          setTurno(turnoData.turno as TurnoData);
          if ((turnoData.turno as TurnoData).is_active) {
            const prodRes  = await fetch("/api/products");
            const prodData = await prodRes.json() as { success: boolean; products: Product[] };
            if (prodData.success) setProducts(prodData.products);
          }
        }
        if (rateData.rate) setRate(rateData.rate as number);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // ── Supabase Realtime: detectar apertura de turno ──
  useEffect(() => {
    const client = getSupabase();
    if (!client) return;
    const channel = client
      .channel("turno")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "config", filter: "key=eq.turno_activo" },
        (payload: { new: Record<string, string> }) => {
          try {
            const val = JSON.parse(payload.new.value) as TurnoData;
            if (val.is_active) window.location.reload();
          } catch { /* skip */ }
        },
      )
      .subscribe();

    return () => { void client.removeChannel(channel); };
  }, []);

  // ── Scroll to category section ──
  function scrollToSection(cat: Category) {
    setActiveTab(cat);
    const el = sectionRefs.current[cat];
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top, behavior: "smooth" });
    }
  }

  // ── Open modal ──
  function openModal(product: Product) {
    setModal(product);
    setSubmitted(false);
    setOrderCode(null);
    setFormError(null);
    setForm({ qty: 1, zone: "", seat: "", name: "", lastname: "", cedula: "" });
  }

  // ── Submit order ──
  async function handleSubmit() {
    if (!modal) return;
    if (!form.zone || !form.name.trim() || !form.lastname.trim()) {
      setFormError("Zona, nombre y apellido son obligatorios");
      return;
    }
    if (form.zone === "VIP" && !form.cedula.trim()) {
      setFormError("Cédula obligatoria para zona VIP");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const res  = await fetch("/api/orders", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin:            "PUB",
          zone:              form.zone,
          seat:              form.seat.trim() || undefined,
          customer_name:     form.name.trim(),
          customer_lastname: form.lastname.trim(),
          customer_id:       form.cedula.trim() || undefined,
          items: [{ product_id: modal.id, qty: form.qty, price_usd: Number(modal.price_usd) }],
        }),
      });
      const data = await res.json() as {
        success: boolean;
        order?: { code: string };
        errors?: string[];
        error?: string;
      };
      if (data.success && data.order) {
        setOrderCode(data.order.code);
        setSubmitted(true);
      } else {
        setFormError(
          Array.isArray(data.errors) ? data.errors[0] : (data.error ?? "Error al enviar pedido"),
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  const grouped = CATS.reduce<Record<Category, Product[]>>(
    (acc, { key }) => {
      acc[key] = products.filter((p) => p.category === key);
      return acc;
    },
    { hamburguesas: [], raciones: [], bebidas: [] },
  );

  // ── Loading ──
  if (loading) {
    return (
      <div className={styles.loading}>
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </div>
    );
  }

  // ── Curtain ──
  if (!turno?.is_active) {
    return (
      <div className={styles.curtain}>
        <div className={styles.curtainGlow} />
        <motion.img
          src="/logo-color.png"
          alt="Sport Bar"
          className={styles.curtainLogo}
          animate={{ opacity: [1, 0.55, 1], scale: [1, 0.95, 1] }}
          transition={{ duration: 3.5, ease: "easeInOut", repeat: Infinity }}
        />
        <div className={styles.curtainBody}>
          <span className={styles.curtainMatch}>
            {turno?.partido_nombre || "Próximo partido"}
          </span>
          <div className={styles.curtainDivider} />
          <span className={styles.curtainSub}>
            El menú abre cuando inicie el partido
          </span>
        </div>
      </div>
    );
  }

  // ── Menu ──
  return (
    <>
      <div className={styles.page}>
        {/* Sticky header */}
        <header className={styles.header}>
          <img src="/logo-color.png" alt="Sport Bar" className={styles.headerLogo} />
          <div className={styles.headerText}>
            <span className={styles.headerTitle}>Sport Bar</span>
            <span className={styles.headerSub}>
              Guaiquerías · {turno.partido_nombre}
            </span>
          </div>
        </header>

        {/* Sticky tabs */}
        <nav className={styles.tabs}>
          {CATS.map(({ key, label, Icon }) => (
            <button
              key={key}
              className={`${styles.tab} ${activeTab === key ? styles.tabActive : ""}`}
              onClick={() => scrollToSection(key)}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </nav>

        {/* Products */}
        <main className={styles.content}>
          {CATS.map(({ key, label, Icon }) => {
            const items = grouped[key];
            if (items.length === 0) return null;
            return (
              <section
                key={key}
                className={styles.catSection}
                ref={(el) => { if (el) sectionRefs.current[key] = el; }}
              >
                <div className={styles.catHeader}>
                  <Icon size={14} />
                  {label}
                  <span className={styles.catCount}>{items.length}</span>
                </div>

                <div className={styles.productGrid}>
                  {items.map((p) => (
                    <motion.article
                      key={p.id}
                      className={styles.productCard}
                      variants={cardVariants}
                      initial="hidden"
                      whileInView="show"
                      viewport={{ once: true, margin: "-30px" }}
                    >
                      <div className={styles.cardPhotoWrap}>
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className={styles.cardPhoto}
                          />
                        ) : (
                          <div className={styles.cardPhotoPlaceholder}>
                            <Icon size={32} />
                          </div>
                        )}
                      </div>

                      <div className={styles.cardBody}>
                        <h3 className={styles.cardName}>{p.name}</h3>
                        {p.description && (
                          <p className={styles.cardDesc}>{p.description}</p>
                        )}
                        <div className={styles.cardFooter}>
                          <div className={styles.priceBlock}>
                            <span className={styles.priceRef}>
                              <span className={styles.priceRefLabel}>REF</span>
                              {Number(p.price_usd).toFixed(2)}
                            </span>
                            <span className={styles.priceBs}>
                              {formatBs(Number(p.price_usd) * rate)}
                            </span>
                          </div>
                          <button
                            className={styles.btnPedir}
                            onClick={() => openModal(p)}
                          >
                            Pedir
                          </button>
                        </div>
                      </div>
                    </motion.article>
                  ))}
                </div>
              </section>
            );
          })}
        </main>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <>
            <motion.div
              className={styles.overlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => { if (!submitted) setModal(null); }}
            />

            <motion.div
              className={styles.sheet}
              variants={sheetVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className={styles.sheetHandle} />

              {submitted ? (
                /* ── Success ── */
                <div className={styles.successState}>
                  <motion.div
                    className={styles.successIcon}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 280, damping: 18 }}
                  >
                    <Check size={28} />
                  </motion.div>
                  <span className={styles.successTitle}>¡Pedido enviado!</span>
                  <span className={styles.successCode}>{orderCode}</span>
                  <span className={styles.successSub}>El mesero llegará con tu orden</span>
                  <button className={styles.btnDone} onClick={() => setModal(null)}>
                    Listo
                  </button>
                </div>
              ) : (
                /* ── Form ── */
                <>
                  <div className={styles.sheetHeader}>
                    <div className={styles.sheetHeaderText}>
                      <span className={styles.sheetProductName}>{modal.name}</span>
                      <div className={styles.sheetPriceRow}>
                        <span className={styles.sheetPriceRef}>
                          <span className={styles.priceRefLabel}>REF</span>
                          {(Number(modal.price_usd) * form.qty).toFixed(2)}
                        </span>
                        <span className={styles.sheetPriceBs}>
                          {formatBs(Number(modal.price_usd) * form.qty * rate)}
                        </span>
                      </div>
                    </div>
                    <button className={styles.sheetClose} onClick={() => setModal(null)}>
                      <X size={16} />
                    </button>
                  </div>

                  {/* Qty */}
                  <div className={styles.qtyRow}>
                    <button
                      className={styles.qtyBtn}
                      onClick={() => setForm((f) => ({ ...f, qty: Math.max(1, f.qty - 1) }))}
                    >
                      −
                    </button>
                    <span className={styles.qtyNum}>{form.qty}</span>
                    <button
                      className={styles.qtyBtn}
                      onClick={() => setForm((f) => ({ ...f, qty: f.qty + 1 }))}
                    >
                      +
                    </button>
                  </div>

                  {/* Zone */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Zona <span className={styles.required}>*</span>
                    </label>
                    <div className={styles.zoneGrid}>
                      {ZONES.map((z) => (
                        <button
                          key={z}
                          className={`${styles.zoneBtn} ${form.zone === z ? styles.zoneBtnActive : ""}`}
                          onClick={() => setForm((f) => ({ ...f, zone: z }))}
                        >
                          {z}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Seat */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Asiento / Mesa</label>
                    <input
                      className={styles.input}
                      placeholder="Ej: Palco 3, Silla 12"
                      value={form.seat}
                      onChange={(e) => setForm((f) => ({ ...f, seat: e.target.value }))}
                    />
                  </div>

                  {/* Name + Lastname */}
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>
                        Nombre <span className={styles.required}>*</span>
                      </label>
                      <input
                        className={styles.input}
                        placeholder="Carlos"
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>
                        Apellido <span className={styles.required}>*</span>
                      </label>
                      <input
                        className={styles.input}
                        placeholder="Pérez"
                        value={form.lastname}
                        onChange={(e) => setForm((f) => ({ ...f, lastname: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Cedula */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Cédula
                      {form.zone === "VIP" && <span className={styles.required}> *</span>}
                    </label>
                    <input
                      className={styles.input}
                      placeholder="V-12345678"
                      value={form.cedula}
                      onChange={(e) => setForm((f) => ({ ...f, cedula: e.target.value }))}
                    />
                  </div>

                  {formError && <div className={styles.errorMsg}>{formError}</div>}

                  <button
                    className={styles.btnSubmit}
                    disabled={
                      submitting ||
                      !form.zone ||
                      !form.name.trim() ||
                      !form.lastname.trim()
                    }
                    onClick={handleSubmit}
                  >
                    <ShoppingBag size={16} />
                    {submitting
                      ? "Enviando..."
                      : `Pedir · REF ${(Number(modal.price_usd) * form.qty).toFixed(2)}`}
                  </button>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
