"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { PackageCheck, MapPin, CheckCircle2 } from "lucide-react";
import { formatRef, formatBs } from "@/lib/dollar-rate";
import type { Zone } from "@/types";
import styles from "./page.module.css";

const ZONES: Zone[] = ["VIP", "Norte", "Sur", "Externa"];
const ACTOR = "DES-001";
const POLL_MS = 8_000;

interface OrderItem {
  id: number;
  qty: number;
  price_usd: number;
  subtotal: number;
  product: { name: string; category: string };
}

interface Order {
  id: number;
  code: string;
  zone: Zone;
  seat: string | null;
  total_usd: number;
  total_bs: number;
  items: OrderItem[];
  user: { code: string; name: string };
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.25, 0, 0, 1] } },
  exit:    { opacity: 0, x: 40, transition: { duration: 0.2 } },
};

export default function KdsDespachoPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [delivering, setDelivering] = useState<Set<number>>(new Set());

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders?status=LISTO");
      const data = await res.json();
      if (data.success) setOrders(data.orders);
    } catch { /* silently retry on next poll */ }
  }, []);

  useEffect(() => {
    fetchOrders();
    const id = setInterval(fetchOrders, POLL_MS);
    return () => clearInterval(id);
  }, [fetchOrders]);

  async function handleEntregar(order: Order) {
    setDelivering((prev) => new Set(prev).add(order.id));
    try {
      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kitchen_status: "ENTREGADO", actor_code: ACTOR }),
      });
      if (res.ok) {
        setOrders((prev) => prev.filter((o) => o.id !== order.id));
      }
    } finally {
      setDelivering((prev) => { const n = new Set(prev); n.delete(order.id); return n; });
    }
  }

  const byZone = ZONES.reduce<Record<Zone, Order[]>>((acc, z) => {
    acc[z] = orders.filter((o) => o.zone === z);
    return acc;
  }, {} as Record<Zone, Order[]>);

  const activeZones = ZONES.filter((z) => byZone[z].length > 0);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.title}>KDS Despacho</span>
          <span className={styles.sub}>Comandas listas · Entregar</span>
        </div>
        <span className={styles.counter}>
          <PackageCheck size={13} />
          {orders.length} lista{orders.length !== 1 ? "s" : ""}
        </span>
      </header>

      {orders.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}><CheckCircle2 size={24} /></div>
          <span className={styles.emptyText}>Sin órdenes listas para despachar</span>
        </div>
      ) : (
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
                    <div className={styles.cardTop}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span className={styles.orderCode}>{order.code}</span>
                        <span className={styles.listoBadge}>
                          <span className={styles.listoDot} />
                          Listo
                        </span>
                      </div>
                      <div className={styles.seatBadge}>
                        <MapPin size={11} />
                        {order.seat ?? order.zone}
                      </div>
                    </div>

                    <ul className={styles.items} style={{ listStyle: "none", margin: 0, padding: 0 }}>
                      {order.items.map((item) => (
                        <li key={item.id} className={styles.item}>
                          <span className={styles.itemQty}>{item.qty}×</span>
                          <span className={styles.itemName}>{item.product.name}</span>
                          <span className={styles.itemSub}>{formatRef(item.subtotal)}</span>
                        </li>
                      ))}
                    </ul>

                    <div className={styles.totals}>
                      <span className={styles.totalRef}>{formatRef(Number(order.total_usd))}</span>
                      <span className={styles.totalBs}>{formatBs(Number(order.total_bs))}</span>
                    </div>

                    <button
                      className={styles.btnEntregar}
                      disabled={delivering.has(order.id)}
                      onClick={() => handleEntregar(order)}
                    >
                      <CheckCircle2 size={16} />
                      {delivering.has(order.id) ? "Entregando..." : "Entregar"}
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
