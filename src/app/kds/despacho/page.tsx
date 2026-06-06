"use client";

// src/app/kds/despacho/page.tsx
// KDS Despacho — ve órdenes LISTO (todos los bumps completados)
// Botón "ENTREGAR" → ENTREGADO, notifica al mesero asignado

import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { AlertTriangle, ArrowLeft, CheckCircle2, MapPin, PackageCheck, RefreshCw, User } from "lucide-react";
import { formatRef, formatBs } from "@/lib/dollar-rate";
import type { Zone } from "@/types";
import styles from "./page.module.css";

const ZONES: Zone[] = ["VIP", "Norte", "Sur", "Externa"];
const ACTOR          = "KDS-DES";
const POLL_MS        = 8_000;

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrderItem {
  id:        number;
  qty:       number;
  price_usd: number;
  subtotal:  number;
  product:   { name: string; category: string };
}

interface OrderUser {
  id:       number;
  code:     string;
  name:     string;
  lastname: string;
}

interface Order {
  id:         number;
  code:       string;
  zone:       Zone;
  seat:       string | null;
  total_usd:  number;
  total_bs:   number;
  updated_at: string;
  items:      OrderItem[];
  user:       OrderUser;
}

// ── Animation variants ────────────────────────────────────────────────────────

const cardVariants: Variants = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.25, 0, 0, 1] } },
  exit:    { opacity: 0, x: 40, transition: { duration: 0.2 } },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function elapsedSinceReady(updatedAt: string, now: Date): string {
  const secs = Math.floor((now.getTime() - new Date(updatedAt).getTime()) / 1000)
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function KdsDespachoPage() {
  const [orders,     setOrders]     = useState<Order[]>([]);
  const [delivering, setDelivering] = useState<Set<number>>(new Set());
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [now,        setNow]        = useState(() => new Date());
  const [lastSync,   setLastSync]   = useState<Date | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1 s clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1_000);
    return () => clearInterval(t);
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const res  = await fetch("/api/kds/despacho", { cache: "no-store" });
      const data = await res.json() as { success: boolean; orders?: Order[]; error?: string };
      if (data.success) {
        setOrders(data.orders ?? []);
        setError(null);
        setLastSync(new Date());
      } else {
        setError(data.error ?? "Error al cargar despacho");
      }
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    pollRef.current = setInterval(fetchOrders, POLL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchOrders]);

  async function handleEntregar(order: Order) {
    setDelivering((prev) => new Set(prev).add(order.id));
    try {
      const res = await fetch(`/api/orders/${order.id}/status`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ kitchen_status: "ENTREGADO", actor_code: ACTOR }),
      });
      if (res.ok) {
        setOrders((prev) => prev.filter((o) => o.id !== order.id));
      }
    } catch {
      /* retry on next poll */
    } finally {
      setDelivering((prev) => { const n = new Set(prev); n.delete(order.id); return n; });
    }
  }

  const byZone      = ZONES.reduce<Record<Zone, Order[]>>((acc, z) => {
    acc[z] = orders.filter((o) => o.zone === z);
    return acc;
  }, {} as Record<Zone, Order[]>);
  const activeZones = ZONES.filter((z) => byZone[z].length > 0);

  return (
    <div className={styles.page}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/admin" className={styles.dashboardBtn} aria-label="Volver al dashboard">
            <ArrowLeft size={14} strokeWidth={2.5} aria-hidden />
            Dashboard
          </Link>
          <div className={styles.brand}>
            <span className={styles.title}>KDS Despacho</span>
            <span className={styles.sub}>Comandas listas · Entregar</span>
          </div>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.counter}>
            <PackageCheck size={13} aria-hidden />
            {orders.length} lista{orders.length !== 1 ? "s" : ""}
          </span>
          {lastSync && (
            <span className={styles.syncLabel}>
              <RefreshCw size={10} aria-hidden />
              {lastSync.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
        </div>
      </header>

      {/* ── Error ───────────────────────────────────────────────────────────── */}
      {error && (
        <div className={styles.errorBanner} role="alert">
          <AlertTriangle size={15} aria-hidden />
          {error}
        </div>
      )}

      {/* ── Loading ─────────────────────────────────────────────────────────── */}
      {loading && (
        <div className={styles.empty}>
          <span className={styles.spinner} aria-hidden />
          <span className={styles.emptyText}>Cargando…</span>
        </div>
      )}

      {/* ── Empty ───────────────────────────────────────────────────────────── */}
      {!loading && orders.length === 0 && !error && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}><CheckCircle2 size={24} aria-hidden /></div>
          <span className={styles.emptyText}>Sin órdenes listas para despachar</span>
        </div>
      )}

      {/* ── Zones ───────────────────────────────────────────────────────────── */}
      {!loading && orders.length > 0 && (
        <div className={styles.zones}>
          {activeZones.map((zone) => (
            <div key={zone} className={styles.zoneGroup}>
              <div className={styles.zoneHeader}>
                <span className={styles.zoneLabel}>{zone}</span>
                <span className={styles.zonePill}>{byZone[zone].length}</span>
              </div>

              <AnimatePresence mode="popLayout">
                {byZone[zone].map((order) => (
                  <motion.div
                    key={order.id}
                    className={styles.card}
                    layout
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    {/* Card top */}
                    <div className={styles.cardTop}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span className={styles.orderCode}>{order.code}</span>
                        <span className={styles.listoBadge}>
                          <span className={styles.listoDot} />
                          Listo · {elapsedSinceReady(order.updated_at, now)}
                        </span>
                      </div>
                      <div className={styles.seatBadge}>
                        <MapPin size={11} aria-hidden />
                        {order.seat ?? order.zone}
                      </div>
                    </div>

                    {/* Mesero */}
                    <div className={styles.meseroRow}>
                      <User size={11} aria-hidden />
                      <span className={styles.meseroName}>
                        {order.user.name} {order.user.lastname}
                      </span>
                      <span className={styles.meseroCode}>{order.user.code}</span>
                    </div>

                    {/* Items */}
                    <ul className={styles.items} style={{ listStyle: "none", margin: 0, padding: 0 }}>
                      {order.items.map((item) => (
                        <li key={item.id} className={styles.item}>
                          <span className={styles.itemQty}>{item.qty}×</span>
                          <span className={styles.itemName}>{item.product.name}</span>
                          <span className={styles.itemSub}>{formatRef(item.subtotal)}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Totals */}
                    <div className={styles.totals}>
                      <span className={styles.totalRef}>{formatRef(Number(order.total_usd))}</span>
                      <span className={styles.totalBs}>{formatBs(Number(order.total_bs))}</span>
                    </div>

                    {/* Entregar */}
                    <button
                      className={styles.btnEntregar}
                      disabled={delivering.has(order.id)}
                      onClick={() => handleEntregar(order)}
                      aria-label={`Entregar orden ${order.code} — mesero ${order.user.code}`}
                    >
                      <CheckCircle2 size={16} aria-hidden />
                      {delivering.has(order.id) ? "Entregando..." : "LISTO PARA ENTREGAR"}
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
