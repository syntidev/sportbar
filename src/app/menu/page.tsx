"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  UtensilsCrossed, Wine, Beef, X, ShoppingBag, Check,
  Star, MapPin, Plus, Minus, ArrowLeft, Receipt, Flame, Snowflake,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { formatBs } from "@/lib/dollar-rate";
import styles from "./page.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────
type Zone      = "Norte" | "Sur" | "VIP" | "Externa";
type AppScreen = "menu" | "cart" | "confirm" | "success";

type SlotEffectType = 'hot' | 'cold' | 'none'
interface HeroSlot { slot: number; url: string | null; type: SlotEffectType }

interface Product {
  id:          number;
  name:        string;
  description: string | null;
  price_usd:   string;
  category:    string;
  is_featured: boolean;
  badge:       string | null;
  image_url:   string | null;
}

interface TurnoData {
  is_active:      boolean;
  partido_nombre: string;
}

interface CartEntry { product: Product; qty: number }

interface FeatCardProps {
  p: Product; rate: number; qty: number;
  onAdd: (p: Product) => void;
  onSelect: (p: Product) => void;
}
interface ProdRowProps {
  p: Product; rate: number; qty: number;
  onAdd: (p: Product) => void;
  onSelect: (p: Product) => void;
}

// ── Group navigation config ───────────────────────────────────────────────────
const CATEGORY_GROUPS: Record<string, string[]> = {
  comida:  ["hamburguesas", "raciones"],
  bebidas: ["bebidas", "cerveza"],
  licores: ["licores"],
};

const GROUP_LABELS: Record<string, string> = {
  comida:  "Comida",
  bebidas: "Bebidas",
  licores: "Licores",
  otros:   "Otros",
};

const GROUP_ICONS: Record<string, LucideIcon> = {
  comida:  Beef,
  bebidas: Wine,
  licores: Wine,
  otros:   UtensilsCrossed,
};

const CAT_ICONS: Record<string, LucideIcon> = {
  hamburguesas: Beef,
  raciones:     UtensilsCrossed,
  bebidas:      Wine,
  cerveza:      Wine,
};

function getCatIcon(cat: string): LucideIcon {
  return CAT_ICONS[cat] ?? UtensilsCrossed;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function CatPlaceholder({ category, size, opacity = 0.4 }: {
  category: string; size: number; opacity?: number;
}) {
  const Icon = getCatIcon(category);
  return <Icon size={size} color={`rgba(240,245,240,${opacity})`} />;
}

const ZONES: Zone[] = ["Norte", "Sur", "VIP", "Externa"];

// ── Animation variants ────────────────────────────────────────────────────────
const sheetV: Variants = {
  hidden:  { y: "100%" },
  visible: { y: 0, transition: { type: "spring", damping: 28, stiffness: 280 } },
  exit:    { y: "100%", transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } },
};

const screenV: Variants = {
  hidden:  { x: "100%" },
  visible: { x: 0, transition: { type: "spring", damping: 30, stiffness: 300 } },
  exit:    { x: "100%", transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } },
};

const staggerContainer: Variants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const staggerContainerFast: Variants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const fadeInUp: Variants = {
  hidden:  { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] } },
};

const slideInLeft: Variants = {
  hidden:  { opacity: 0, x: -14 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

// ── SlotEffect — vapor (hot) / condensación (cold) ─────────────────────────────
type WispVariant = 'steamWispA' | 'steamWispB' | 'steamWispC'
type DropVariant = 'coldDropS'  | 'coldDropM'  | 'coldDropL'

const HOT_WISPS: { left: string; v: WispVariant; delay: string }[] = [
  { left: '22%', v: 'steamWispB', delay: '0s'   },
  { left: '33%', v: 'steamWispA', delay: '0.6s' },
  { left: '44%', v: 'steamWispC', delay: '1.2s' },
  { left: '54%', v: 'steamWispA', delay: '0.4s' },
  { left: '63%', v: 'steamWispB', delay: '1.8s' },
  { left: '72%', v: 'steamWispC', delay: '0.9s' },
]

const COLD_DROPS_DATA: { left: string; w: string; h: string; delay: string; v: DropVariant }[] = [
  { left: '10%', w: '1.5px', h: '15px', delay: '0s',   v: 'coldDropM' },
  { left: '24%', w: '2px',   h: '11px', delay: '0.7s', v: 'coldDropS' },
  { left: '38%', w: '1px',   h: '18px', delay: '0.2s', v: 'coldDropL' },
  { left: '53%', w: '2px',   h: '13px', delay: '1.1s', v: 'coldDropM' },
  { left: '67%', w: '1.5px', h: '10px', delay: '0.5s', v: 'coldDropS' },
  { left: '80%', w: '1px',   h: '20px', delay: '1.6s', v: 'coldDropL' },
  { left: '92%', w: '2px',   h: '14px', delay: '0.9s', v: 'coldDropM' },
]

function SlotEffect({ type }: { type: SlotEffectType }) {
  if (type === 'none') return null
  return (
    <div className={styles.slotEffect}>
      {type === 'hot' && (
        <>
          <div className={styles.hotGlow} />
          {HOT_WISPS.map((w, i) => (
            <div
              key={i}
              className={`${styles.steamWisp} ${styles[w.v]}`}
              style={{ left: w.left, animationDelay: w.delay }}
            />
          ))}
        </>
      )}
      {type === 'cold' && (
        <>
          <div className={styles.coldOverlay} />
          <div className={styles.coldGlow} />
          {COLD_DROPS_DATA.map((d, i) => (
            <div
              key={i}
              className={`${styles.coldDrop} ${styles[d.v]}`}
              style={{ left: d.left, width: d.w, height: d.h, animationDelay: d.delay }}
            />
          ))}
        </>
      )}
    </div>
  )
}

// ── SplashScreen ──────────────────────────────────────────────────────────────
function SplashScreen({ onDone, splashUrl }: { onDone: () => void; splashUrl: string | null }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      className={styles.splash}
      exit={{ opacity: 0, transition: { duration: 0.55, ease: "easeInOut" } }}
    >
      {/* Background glows */}
      <div className={styles.splashGlow} />
      <div className={styles.splashGlow2} />

      {/* Top logo */}
      <motion.img
        src="/logo-color.png"
        alt="Sport Bar"
        className={styles.splashTopLogo}
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      />

      {/* Hero image — dinámica desde config o ninguna si no está configurada */}
      {splashUrl && (
        <motion.div
          className={styles.splashImgWrap}
          initial={{ y: 100, scale: 0.78, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 18, stiffness: 140, delay: 0.1 }}
        >
          <motion.img
            src={splashUrl}
            alt="Sport Bar"
            className={styles.splashImg}
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
          {/* Pulsing ring */}
          <motion.div
            className={styles.splashRing}
            animate={{ scale: [1, 1.14, 1], opacity: [0.28, 0.58, 0.28] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Second ring, offset */}
          <motion.div
            className={styles.splashRing2}
            animate={{ scale: [1.15, 1, 1.15], opacity: [0.12, 0.28, 0.12] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
          />
        </motion.div>
      )}

      {/* Brand text */}
      <motion.div
        className={styles.splashTextBlock}
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className={styles.splashBrand}>SPORT BAR</div>
        <div className={styles.splashSub}>El menú del partido</div>
      </motion.div>

      {/* Loading dots */}
      <motion.div
        className={styles.splashDots}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3, duration: 0.4 }}
      >
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </motion.div>
    </motion.div>
  );
}

// ── ProductModal ──────────────────────────────────────────────────────────────
function ProductModal({
  product,
  rate,
  currentCartQty,
  onClose,
  onAdd,
}: {
  product: Product;
  rate: number;
  currentCartQty: number;
  onClose: () => void;
  onAdd: (p: Product, qty: number) => void;
}) {
  const [qty, setQty] = useState(1);
  const total = Number(product.price_usd) * qty;

  return (
    <>
      <motion.div
        className={styles.scrim}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className={styles.prodModal}
        variants={sheetV}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className={styles.handle} />

        {/* Product image — burger-float: entra desde abajo, flota con drop-shadow */}
        <div className={styles.prodModalImgWrap}>
          {/* Glow atmosférico detrás del producto */}
          <div className={styles.prodModalImgGrad} />
          {product.image_url ? (
            <motion.img
              src={product.image_url}
              alt={product.name}
              className={styles.prodModalImg}
              initial={{ scale: 0.78, y: 60, opacity: 0 }}
              animate={{ scale: 1.05, y: -10, opacity: 1 }}
              transition={{ duration: 0.8, ease: [0.17, 0.67, 0.83, 0.67], delay: 0.05 }}
            />
          ) : (
            <motion.div
              className={styles.prodModalImgEmpty}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <CatPlaceholder category={product.category} size={80} opacity={0.3} />
            </motion.div>
          )}
          <button className={styles.prodModalClose} onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
          {currentCartQty > 0 && (
            <motion.span
              className={styles.prodModalCartBadge}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 14 }}
            >
              {currentCartQty} en pedido
            </motion.span>
          )}
        </div>

        {/* Info body */}
        <div className={styles.prodModalBody}>
          <div className={styles.prodModalName}>{product.name}</div>
          {product.description && (
            <div className={styles.prodModalDesc}>{product.description}</div>
          )}
          <div className={styles.prodModalPriceRow}>
            <div>
              <span className={styles.prodModalPrice}>
                REF {Number(product.price_usd).toFixed(2)}
              </span>
              <div className={styles.prodModalBs}>
                {formatBs(Number(product.price_usd) * rate)}
              </div>
            </div>
            {product.badge && (
              <span className={styles.prodModalBadge}>{product.badge}</span>
            )}
          </div>
        </div>

        {/* Footer: stepper + CTA */}
        <div className={styles.prodModalFoot}>
          <div className={styles.stepper}>
            <button
              className={styles.stepMinus}
              onClick={() => setQty(q => Math.max(1, q - 1))}
              aria-label="Menos"
            >
              <Minus size={16} />
            </button>
            <motion.span
              key={qty}
              className={styles.stepQ}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 15 }}
            >
              {qty}
            </motion.span>
            <button
              className={styles.stepPlus}
              onClick={() => setQty(q => q + 1)}
              aria-label="Más"
            >
              <Plus size={16} />
            </button>
          </div>

          <button
            className={styles.prodModalAdd}
            onClick={() => { onAdd(product, qty); onClose(); }}
          >
            <Plus size={18} color="#1a1308" strokeWidth={2.6} />
            AGREGAR — REF {total.toFixed(2)}
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ── FeatCard ──────────────────────────────────────────────────────────────────
function FeatCard({ p, rate, qty, onAdd, onSelect }: FeatCardProps) {
  const [pop, setPop] = useState(false);
  const quickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPop(true);
    onAdd(p);
    setTimeout(() => setPop(false), 340);
  };
  return (
    <div className={styles.featCard} onClick={() => onSelect(p)}>
      <div className={styles.featPhotoOuter}>
        {p.image_url
          ? <img src={p.image_url} alt={p.name} className={styles.featPhotoImg} />
          : <div className={styles.featPhotoEmpty}>
              <CatPlaceholder category={p.category} size={52} opacity={0.3} />
            </div>
        }
      </div>
      <div className={styles.featName}>{p.name}</div>
      <div className={styles.featDesc}>{p.description ?? " "}</div>
      <div className={styles.featFoot}>
        <div>
          <div className={styles.featPrice}>REF {Number(p.price_usd).toFixed(2)}</div>
          <div className={styles.featBs}>{formatBs(Number(p.price_usd) * rate)}</div>
        </div>
        <button
          className={`${styles.featAdd} ${pop ? styles.pop : ""}`}
          onClick={quickAdd}
          aria-label={"Agregar " + p.name}
        >
          <Plus size={18} color="#000" strokeWidth={2.8} />
        </button>
      </div>
      {qty > 0 && <span className={styles.featQty}>{qty}</span>}
    </div>
  );
}

// ── ProdRow ───────────────────────────────────────────────────────────────────
function ProdRow({ p, rate, qty, onAdd, onSelect }: ProdRowProps) {
  const [pop, setPop] = useState(false);
  const quickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPop(true);
    onAdd(p);
    setTimeout(() => setPop(false), 340);
  };
  return (
    <div
      className={styles.prod + (qty > 0 ? " " + styles.prodIn : "")}
      onClick={() => onSelect(p)}
    >
      <div className={styles.prodPlate}>
        <div className={styles.prodPlateGlow} />
        <div className={styles.prodPlateInner}>
          {p.image_url
            ? <img src={p.image_url} alt={p.name} className={styles.prodImg} />
            : <CatPlaceholder category={p.category} size={30} />
          }
        </div>
      </div>
      <div className={styles.prodBody}>
        <div className={styles.prodName}>{p.name}</div>
        {p.description && <div className={styles.prodDesc}>{p.description}</div>}
        <div className={styles.prodMeta}>
          <span className={styles.prodPrice}>REF {Number(p.price_usd).toFixed(2)}</span>
          <span className={styles.prodBs}>{formatBs(Number(p.price_usd) * rate)}</span>
        </div>
      </div>
      {qty > 0 && <span className={styles.prodQty}>x{qty}</span>}
      <button
        className={styles.prodAdd + (pop ? " " + styles.pop : "")}
        onClick={quickAdd}
        aria-label={"Agregar " + p.name}
      >
        +
      </button>
    </div>
  );
}

// ── MenuContent ───────────────────────────────────────────────────────────────
function MenuContent() {
  const [turno,         setTurno]         = useState<TurnoData | null>(null);
  const [products,      setProducts]      = useState<Product[]>([]);
  const [rate,          setRate]          = useState(50.0);
  const [loading,       setLoading]       = useState(true);
  const [activeGroup,   setActiveGroup]   = useState<string>("comida");
  const [appScreen,     setAppScreen]     = useState<AppScreen>("menu");
  const [cart,          setCart]          = useState<Map<number, CartEntry>>(new Map());
  const [orderCode,     setOrderCode]     = useState<string | null>(null);
  const [orderCount,    setOrderCount]    = useState(0);
  const [submitting,    setSubmitting]    = useState(false);
  const [formError,     setFormError]     = useState<string | null>(null);
  const [orderSnapshot, setOrderSnapshot] = useState<{ items: CartEntry[]; total: number } | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({
    zone:     "" as Zone | "",
    seat:     "",
    name:     "",
    lastname: "",
    cedula:   "",
  });

  // Hero slider state
  const [heroSlots,  setHeroSlots]  = useState<HeroSlot[]>([]);
  const [sliderIdx,  setSliderIdx]  = useState(0);
  const sliderTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const swipeStart  = useRef<{ x: number; y: number } | null>(null);
  const swipeDragging = useRef(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Animated tab indicator
  const navRef  = useRef<HTMLElement>(null);
  const [tabPill, setTabPill] = useState<{ left: number; width: number } | null>(null);

  // URL params for analytics
  const searchParams = useSearchParams();
  const zoneParam = searchParams.get("zona") ?? searchParams.get("zone") ?? null;

  // Set of all categorias that belong to a known group
  const allGroupCats = useMemo(
    () => new Set(Object.values(CATEGORY_GROUPS).flat()),
    [],
  );

  // Bootstrap
  useEffect(() => {
    async function init() {
      try {
        const [tRes, rRes, hsRes] = await Promise.all([
          fetch("/api/turno"),
          fetch("/api/currency"),
          fetch("/api/config/hero-slots"),
        ]);
        const [tData, rData, hsData] = await Promise.all([tRes.json(), rRes.json(), hsRes.json()]);
        if (tData.success) {
          setTurno(tData.turno as TurnoData);
          if ((tData.turno as TurnoData).is_active) {
            const pRes  = await fetch("/api/products");
            const pData = await pRes.json() as { success: boolean; products: Product[] };
            if (pData.success) setProducts(pData.products);
          }
        }
        if (rData.rate) setRate(rData.rate as number);
        const slots = ((hsData as { success: boolean; slots: HeroSlot[] }).slots ?? []).filter((s: HeroSlot) => s.url !== null);
        setHeroSlots(slots);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Analytics — track page_view on mount
  useEffect(() => {
    const deviceType = /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop";
    void fetch("/api/analytics/track", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: "page_view", zone: zoneParam, device_type: deviceType }),
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-populate zone from URL ?zona= param
  useEffect(() => {
    if (zoneParam && (ZONES as readonly string[]).includes(zoneParam)) {
      setForm(f => ({ ...f, zone: zoneParam as Zone }));
    }
  }, [zoneParam]);

  // Hero slider autoplay (4 s)
  const activeSlots = useMemo(() => heroSlots.filter(s => s.url !== null), [heroSlots]);

  const restartSliderTimer = useCallback((slots: HeroSlot[]) => {
    if (sliderTimer.current) clearInterval(sliderTimer.current);
    if (slots.length <= 1) return;
    sliderTimer.current = setInterval(() => {
      setSliderIdx(i => (i + 1) % slots.length);
    }, 7000);
  }, []);

  useEffect(() => {
    restartSliderTimer(activeSlots);
    return () => { if (sliderTimer.current) clearInterval(sliderTimer.current); };
  }, [activeSlots, restartSliderTimer]);

  const onSliderTouchStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
    swipeStart.current  = { x, y };
    swipeDragging.current = false;
  }, []);

  const onSliderTouchEnd = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!swipeStart.current) return;
    const x = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
    const y = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY;
    const dx = x - swipeStart.current.x;
    const dy = y - swipeStart.current.y;
    swipeStart.current = null;
    // Only handle if horizontal drag dominates and > 40px
    if (Math.abs(dx) < 40 || Math.abs(dy) > Math.abs(dx)) return;
    setSliderIdx(i => {
      const next = dx < 0
        ? (i + 1) % activeSlots.length
        : (i - 1 + activeSlots.length) % activeSlots.length;
      return next;
    });
    restartSliderTimer(activeSlots);
  }, [activeSlots, restartSliderTimer]);

  // After products load, set activeGroup to first group that has products
  useEffect(() => {
    if (products.length === 0) return;
    const first = Object.keys(CATEGORY_GROUPS).find(gk =>
      CATEGORY_GROUPS[gk].some(cat => products.some(p => p.category === cat)),
    );
    if (first) setActiveGroup(first);
  }, [products]);

  // Supabase Realtime — canal broadcast 'turno'
  useEffect(() => {
    const client = getSupabase();
    if (!client) return;
    const ch = client
      .channel("turno")
      .on(
        "broadcast",
        { event: "turno_update" },
        ({ payload }: { payload: { is_active: boolean; partido_nombre: string } }) => {
          if (payload.is_active) {
            window.location.reload();
          } else {
            setTurno(prev => prev ? { ...prev, ...payload } : payload as TurnoData);
          }
        },
      )
      .subscribe();
    return () => { void client.removeChannel(ch); };
  }, []);

  // Update animated tab indicator position
  // Depende de products también: cuando los tabs aparecen en DOM por primera vez
  // (productos cargados), el effect debe re-correr aunque activeGroup no cambie
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    // rAF garantiza que el DOM ya pintó los botones antes de medir
    const id = requestAnimationFrame(() => {
      const btn = nav.querySelector<HTMLElement>('[data-active="true"]');
      if (!btn) return;
      setTabPill({ left: btn.offsetLeft, width: btn.offsetWidth });
    });
    return () => cancelAnimationFrame(id);
  }, [activeGroup, products]);

  // Group tabs — only groups with at least one product
  const groupTabs = useMemo(() => {
    const tabs = Object.keys(CATEGORY_GROUPS)
      .filter(gk =>
        CATEGORY_GROUPS[gk].some(cat => products.some(p => p.category === cat)),
      )
      .map(gk => ({ key: gk, label: GROUP_LABELS[gk] ?? capitalize(gk) }));
    const hasOthers = products.some(p => !allGroupCats.has(p.category));
    if (hasOthers) tabs.push({ key: "otros", label: GROUP_LABELS.otros });
    return tabs;
  }, [products, allGroupCats]);

  // All products belonging to the active group
  const activeGroupProducts = useMemo(() => {
    if (activeGroup === "otros") {
      return products.filter(p => !allGroupCats.has(p.category));
    }
    const cats = CATEGORY_GROUPS[activeGroup] ?? [];
    return products.filter(p => cats.includes(p.category));
  }, [activeGroup, products, allGroupCats]);

  // Pinned duo — primeros 2 productos con estrella, lado a lado
  const pinnedDuo = useMemo(
    () => activeGroupProducts.filter(p => p.is_featured).slice(0, 2),
    [activeGroupProducts],
  );

  // Featured rail — productos con estrella más allá del duo, max 6
  const featured = useMemo(
    () => activeGroupProducts.filter(p => p.is_featured).slice(2, 8),
    [activeGroupProducts],
  );

  // Subcategory sections within the active group
  const subCatSections = useMemo(() => {
    if (activeGroup === "otros") {
      const otherCats = Array.from(
        new Set(
          products.filter(p => !allGroupCats.has(p.category)).map(p => p.category),
        ),
      );
      return otherCats.map(cat => ({
        cat,
        items: products.filter(p => p.category === cat),
      }));
    }
    return (CATEGORY_GROUPS[activeGroup] ?? [])
      .map(cat => ({ cat, items: products.filter(p => p.category === cat) }))
      .filter(s => s.items.length > 0);
  }, [activeGroup, products, allGroupCats]);

  // Switch group tab and reset scroll
  const switchGroup = useCallback((key: string) => {
    setActiveGroup(key);
    scrollRef.current?.scrollTo({ top: 0 });
  }, []);

  // Cart
  const addToCart = useCallback((p: Product) => {
    if (navigator.vibrate) navigator.vibrate([12]);
    setCart(prev => {
      const next = new Map(prev);
      const e = next.get(p.id);
      next.set(p.id, { product: p, qty: (e?.qty ?? 0) + 1 });
      return next;
    });
  }, []);

  const addFromModal = useCallback((p: Product, qty: number) => {
    if (navigator.vibrate) navigator.vibrate([12]);
    setCart(prev => {
      const next = new Map(prev);
      const e = next.get(p.id);
      next.set(p.id, { product: p, qty: (e?.qty ?? 0) + qty });
      return next;
    });
  }, []);

  const changeQty = useCallback((id: number, delta: number) => {
    setCart(prev => {
      const next = new Map(prev);
      const e = next.get(id);
      if (!e) return prev;
      const nq = e.qty + delta;
      if (nq <= 0) next.delete(id);
      else next.set(id, { ...e, qty: nq });
      return next;
    });
  }, []);

  const openModal = useCallback((p: Product) => {
    setSelectedProduct(p);
  }, []);

  const cartItems = Array.from(cart.values());
  const cartCount = cartItems.reduce((s, e) => s + e.qty, 0);
  const cartTotal = cartItems.reduce((s, e) => s + Number(e.product.price_usd) * e.qty, 0);

  const seatLabel = form.zone
    ? form.seat ? form.zone + " - " + form.seat : form.zone
    : "Mi zona";

  // Submit order
  async function handleSubmit() {
    if (!form.zone || !form.name.trim() || !form.lastname.trim()) {
      setFormError("Zona, nombre y apellido son obligatorios");
      return;
    }
    if (form.zone === "VIP" && !form.cedula.trim()) {
      setFormError("Cedula obligatoria para zona VIP");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch("/api/orders", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin:            "PUB",
          zone:              form.zone,
          seat:              form.seat.trim() || undefined,
          customer_name:     form.name.trim(),
          customer_lastname: form.lastname.trim(),
          customer_id:       form.cedula.trim() || undefined,
          items: cartItems.map(({ product, qty }) => ({
            product_id: product.id,
            qty,
            price_usd:  Number(product.price_usd),
          })),
        }),
      });
      const data = await res.json() as {
        success: boolean;
        order?:  { code: string };
        errors?: string[];
        error?:  string;
      };
      if (data.success && data.order) {
        setOrderSnapshot({ items: [...cartItems], total: cartTotal });
        setOrderCode(data.order.code);
        setCart(new Map());
        setOrderCount(c => c + 1);
        setAppScreen("success");
      } else {
        setFormError(
          Array.isArray(data.errors)
            ? data.errors[0]
            : (data.error ?? "Error al enviar pedido"),
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

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

  // ── Curtain (turno inactivo) ──
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
            {turno?.partido_nombre || "Proximo partido"}
          </span>
          <div className={styles.curtainDivider} />
          <span className={styles.curtainSub}>
            El menu abre cuando inicie el partido
          </span>
        </div>
      </div>
    );
  }

  // ── Menu ──
  return (
    <>
      <div className={styles.page}>

        {/* Header */}
        <div className={styles.custHead}>
          <img src="/logo-color.png" alt="Sport Bar" className={styles.custHeadLogo} />
          <div className={styles.custHeadWm}>SPORT BAR</div>
          <button className={styles.custTicketsBtn} aria-label="Mis pedidos">
            <Receipt size={19} />
            {orderCount > 0 && <span className={styles.nb}>{orderCount}</span>}
          </button>
          <div className={styles.custLoc}>
            <MapPin size={12} color="var(--color-brand)" />
            {seatLabel}
          </div>
        </div>

        {/* Group tabs — animated sliding indicator */}
        <nav className={styles.custTabs} ref={navRef}>
          {/* Spring-animated indicator bar */}
          {tabPill && (
            <motion.div
              className={styles.tabIndicatorBar}
              animate={{ left: tabPill.left, width: tabPill.width }}
              initial={false}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
            />
          )}
          {groupTabs.map(({ key, label }) => {
            const Icon = GROUP_ICONS[key] ?? Star;
            const isActive = activeGroup === key;
            return (
              <button
                key={key}
                data-active={isActive ? "true" : undefined}
                className={`${styles.custTab}${isActive ? " " + styles.custTabActive : ""}`}
                onClick={() => switchGroup(key)}
              >
                <Icon size={14} className={styles.tabBtnIcon} />
                <span className={styles.tabBtnLbl}>{label}</span>
              </button>
            );
          })}
        </nav>

        {/* Scroll area */}
        <div
          className={styles.mScroll}
          ref={scrollRef}
          style={{ paddingBottom: cartCount > 0 ? 110 : 24 }}
        >

          {/* Ad banner slider — scrollea con el contenido */}
          {activeSlots.length > 0 && (
            <div
              className={styles.adSlider}
              onTouchStart={onSliderTouchStart}
              onTouchEnd={onSliderTouchEnd}
              onMouseDown={onSliderTouchStart}
              onMouseUp={onSliderTouchEnd}
            >
              <div
                className={styles.adTrack}
                style={{ transform: `translateX(-${sliderIdx * 100}%)` }}
              >
                {activeSlots.map((s, i) => (
                  <div key={s.slot} className={styles.adSlide} style={{ position: 'relative' }}>
                    <img src={s.url!} alt={`Banner ${i + 1}`} className={styles.adSlideImg} />
                    <SlotEffect type={s.type} />
                  </div>
                ))}
              </div>
              {activeSlots.length > 1 && (
                <div className={styles.adDots}>
                  {activeSlots.map((_, i) => (
                    <button
                      key={i}
                      className={styles.adDot + (i === sliderIdx ? " " + styles.adDotActive : "")}
                      onClick={() => {
                        setSliderIdx(i);
                        restartSliderTimer(activeSlots);
                      }}
                      aria-label={`Slide ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pinned Duo — los 2 primeros productos con estrella, lado a lado */}
          {pinnedDuo.length > 0 && (
            <div className={styles.pinnedDuo}>
              {pinnedDuo.map(p => (
                <FeatCard
                  key={p.id}
                  p={p}
                  rate={rate}
                  qty={cart.get(p.id)?.qty ?? 0}
                  onAdd={addToCart}
                  onSelect={openModal}
                />
              ))}
            </div>
          )}

          {/* Featured rail — staggered fadeInUp */}
          {featured.length > 0 && (
            <>
              <div className={styles.secHead}>
                <Star size={20} color="var(--color-brand)" />
                <span className={styles.secHeadT}>Destacados</span>
              </div>
              <motion.div
                key={activeGroup + "_feat"}
                className={styles.featRail}
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.1 }}
              >
                {featured.map(p => (
                  <motion.div key={p.id} variants={fadeInUp} style={{ flex: "none" }}>
                    <FeatCard
                      p={p}
                      rate={rate}
                      qty={cart.get(p.id)?.qty ?? 0}
                      onAdd={addToCart}
                      onSelect={openModal}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </>
          )}

          {/* Subcategory sections — staggered slideInLeft */}
          {subCatSections.map(({ cat, items }) => {
            const Icon = getCatIcon(cat);
            return (
              <div key={cat}>
                <div className={styles.subSecHead}>
                  <Icon size={18} />
                  <span className={styles.subSecHeadT}>{capitalize(cat)}</span>
                  <span className={styles.subSecHeadN}>{items.length} opciones</span>
                </div>
                <motion.div
                  key={cat + activeGroup}
                  className={styles.prodList}
                  variants={staggerContainerFast}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.05 }}
                >
                  {items.map(p => (
                    <motion.div key={p.id} variants={slideInLeft}>
                      <ProdRow
                        p={p}
                        rate={rate}
                        qty={cart.get(p.id)?.qty ?? 0}
                        onAdd={addToCart}
                        onSelect={openModal}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            );
          })}

          <div style={{ height: 8 }} />
        </div>

        {/* Cart FAB — badge bounce on item added */}
        <AnimatePresence>
          {cartCount > 0 && (
            <motion.button
              className={styles.cartFab}
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", damping: 22, stiffness: 300 }}
              onClick={() => setAppScreen("cart")}
            >
              <ShoppingBag size={22} color="#1a1308" />
              <span className={styles.cartFabLbl}>VER PEDIDO</span>
              <motion.span
                key={cartCount}
                className={styles.cartFabCt}
                initial={{ scale: 1.7 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 14 }}
              >
                {cartCount}
              </motion.span>
              <span className={styles.cartFabTot}>REF {cartTotal.toFixed(2)}</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Product Modal — Estado 3 */}
      <AnimatePresence>
        {selectedProduct && (
          <ProductModal
            key="prodModal"
            product={selectedProduct}
            rate={rate}
            currentCartQty={cart.get(selectedProduct.id)?.qty ?? 0}
            onClose={() => setSelectedProduct(null)}
            onAdd={addFromModal}
          />
        )}
      </AnimatePresence>

      {/* Cart sheet */}
      <AnimatePresence>
        {appScreen === "cart" && (
          <>
            <motion.div
              className={styles.scrim}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAppScreen("menu")}
            />
            <motion.div
              className={styles.cartSheet}
              variants={sheetV}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className={styles.handle} />
              <div className={styles.cartSheetHead}>
                <span className={styles.cartSheetTitle}>Tu pedido</span>
                <button className={styles.sheetClose} onClick={() => setAppScreen("menu")}>
                  <X size={20} />
                </button>
              </div>

              <div className={styles.cartItems}>
                {cartItems.map(({ product: p, qty }) => (
                  <div key={p.id} className={styles.cartItem}>
                    <div className={styles.cartItemThumb}>
                      {p.image_url
                        ? <img src={p.image_url} alt={p.name} className={styles.cartItemImg} />
                        : <CatPlaceholder category={p.category} size={24} />
                      }
                    </div>
                    <div className={styles.cartItemInfo}>
                      <div className={styles.cartItemName}>{p.name}</div>
                      <div className={styles.cartItemPrice}>
                        REF {(Number(p.price_usd) * qty).toFixed(2)}
                      </div>
                    </div>
                    <div className={styles.stepper}>
                      <button
                        className={styles.stepMinus}
                        onClick={() => changeQty(p.id, -1)}
                      >
                        <Minus size={16} />
                      </button>
                      <span className={styles.stepQ}>{qty}</span>
                      <button
                        className={styles.stepPlus}
                        onClick={() => changeQty(p.id, 1)}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.cartFoot}>
                <div className={styles.cartTotalRow}>
                  <span className={styles.cartTotalLabel}>Total</span>
                  <span className={styles.cartTotalRef}>REF {cartTotal.toFixed(2)}</span>
                </div>
                <div className={styles.cartTotalBs}>
                  {formatBs(cartTotal * rate)}
                </div>
                <button
                  className={styles.btnConfirm}
                  onClick={() => setAppScreen("confirm")}
                >
                  CONFIRMAR PEDIDO
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Confirm screen */}
      <AnimatePresence>
        {appScreen === "confirm" && (
          <motion.div
            className={styles.overlayScreen}
            variants={screenV}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className={styles.mHead}>
              <button className={styles.mBack} onClick={() => setAppScreen("cart")}>
                <ArrowLeft size={20} />
              </button>
              <h2 className={styles.mTitle}>Confirmar</h2>
            </div>

            <div
              className={styles.mScroll}
              style={{ padding: "4px 16px 20px", overflowY: "auto" }}
            >
              <div className={styles.formGroup}>
                <label className={styles.flabel}>
                  Zona <span className={styles.req}>*</span>
                </label>
                {zoneParam && (ZONES as readonly string[]).includes(zoneParam) ? (
                  <div className={styles.zoneLocked}>
                    <MapPin size={13} color="var(--color-brand)" />
                    <span>{zoneParam}</span>
                    <span className={styles.zoneLockedHint}>desde QR</span>
                  </div>
                ) : (
                  <div className={styles.zoneGrid}>
                    {ZONES.map(z => (
                      <button
                        key={z}
                        className={
                          styles.zoneBtn +
                          (form.zone === z ? " " + styles.zoneBtnSel : "")
                        }
                        onClick={() => setForm(f => ({ ...f, zone: z }))}
                      >
                        {z}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.flabel}>Asiento / Mesa</label>
                <input
                  className={styles.field}
                  placeholder="Ej: Fila G, Silla 12"
                  value={form.seat}
                  onChange={e => setForm(f => ({ ...f, seat: e.target.value }))}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.flabel}>
                  Nombre <span className={styles.req}>*</span>
                </label>
                <input
                  className={styles.field}
                  placeholder="Carlos"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.flabel}>
                  Apellido <span className={styles.req}>*</span>
                </label>
                <input
                  className={styles.field}
                  placeholder="Perez"
                  value={form.lastname}
                  onChange={e => setForm(f => ({ ...f, lastname: e.target.value }))}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.flabel}>
                  Cedula
                  {form.zone === "VIP" && <span className={styles.req}> *</span>}
                </label>
                <input
                  className={styles.field}
                  placeholder="V-12345678"
                  inputMode="numeric"
                  value={form.cedula}
                  onChange={e => {
                    const d = e.target.value.replace(/\D/g, "").slice(0, 8);
                    setForm(f => ({ ...f, cedula: d ? "V-" + d : "" }));
                  }}
                />
              </div>

              {formError && <div className={styles.errorMsg}>{formError}</div>}
            </div>

            <div className={styles.mFoot}>
              <button
                className={styles.btnGenerar}
                disabled={
                  submitting ||
                  !form.zone ||
                  !form.name.trim() ||
                  !form.lastname.trim()
                }
                onClick={handleSubmit}
              >
                {submitting ? "Generando ticket..." : "GENERAR TICKET"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success screen */}
      <AnimatePresence>
        {appScreen === "success" && (
          <motion.div
            className={styles.overlayScreen}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className={styles.mScroll} style={{ overflowY: "auto" }}>
              <div className={styles.successTop}>
                <motion.div
                  className={styles.successIcon}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 280, damping: 18 }}
                >
                  <Check size={44} color="var(--color-primary-light)" strokeWidth={3} />
                </motion.div>
                <div className={styles.successSub}>Tu código de ticket</div>
                <div className={styles.successCode}>{orderCode}</div>
                <div className={styles.successMsg2}>
                  Tu pedido fue recibido. Muestra este código al personal.
                </div>
              </div>

              {orderSnapshot && (
                <div className={styles.successItems}>
                  {orderSnapshot.items.map(({ product: p, qty }) => (
                    <div key={p.id} className={styles.successItemRow}>
                      <span className={styles.successItemQty}>{qty}×</span>
                      <span className={styles.successItemName}>{p.name}</span>
                      <span className={styles.successItemPrice}>
                        REF {(Number(p.price_usd) * qty).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className={styles.successTotal}>
                    <span>Total</span>
                    <span className={styles.successTotalAmt}>
                      REF {orderSnapshot.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div style={{ padding: "0 20px 40px" }}>
                <button
                  className={styles.btnPrimary}
                  style={{ width: "100%", marginTop: 20 }}
                  onClick={() => {
                    setAppScreen("menu");
                    setOrderCode(null);
                    setOrderSnapshot(null);
                    setForm(f => ({
                      zone: (zoneParam && (ZONES as readonly string[]).includes(zoneParam))
                        ? zoneParam as Zone : "",
                      seat: "", name: "", lastname: "", cedula: "",
                    }));
                    scrollRef.current?.scrollTo({ top: 0 });
                  }}
                >
                  NUEVO PEDIDO
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── MenuPublicoPage — splash gate ─────────────────────────────────────────────
export default function MenuPublicoPage() {
  const [ready,      setReady]      = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [splashUrl,  setSplashUrl]  = useState<string | null>(null);

  useEffect(() => {
    // Determinar si mostrar splash
    let shouldShow = false;
    try {
      shouldShow = sessionStorage.getItem("sb-splash") !== "1";
      setShowSplash(shouldShow);
    } catch {
      setShowSplash(false);
    }
    setReady(true);

    // Cargar URL dinámica del splash desde config
    fetch("/api/config/splash")
      .then(r => r.json())
      .then((d: { success: boolean; url: string | null }) => {
        if (d.success && d.url) setSplashUrl(d.url);
      })
      .catch(() => {});
  }, []);

  const onSplashDone = useCallback(() => {
    try { sessionStorage.setItem("sb-splash", "1"); } catch {}
    setShowSplash(false);
  }, []);

  // Prevent SSR / hydration mismatch
  if (!ready) return null;

  return (
    <Suspense>
      <AnimatePresence mode="wait">
        {showSplash ? (
          <SplashScreen key="splash" onDone={onSplashDone} splashUrl={splashUrl} />
        ) : (
          <MenuContent key="menu" />
        )}
      </AnimatePresence>
    </Suspense>
  );
}
