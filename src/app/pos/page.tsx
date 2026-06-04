"use client";

import Image from "next/image";
import Link from "next/link";
import { UtensilsCrossed, ClipboardList, CreditCard } from "lucide-react";
import { motion, type Variants } from "framer-motion";
import styles from "./page.module.css";

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0, 0, 1] } },
};

const stats = [
  { label: "Pendientes", value: 3, colorVar: "--color-pendiente" },
  { label: "Crédito", value: 1, colorVar: "--color-credito" },
  { label: "Cobrados", value: 12, colorVar: "--color-pagado" },
  { label: "Total REF", value: "48.50", colorVar: "--color-text-muted" },
];

const buttons = [
  {
    href: "/pos/nueva-orden",
    label: "Nueva Orden",
    subtitle: "Tomar pedido",
    icon: UtensilsCrossed,
    className: styles.btnNuevaOrden,
    iconClass: styles.btnIconNuevaOrden,
    badge: null,
  },
  {
    href: "/pos/comandas",
    label: "Comandas",
    subtitle: "Pedidos activos",
    icon: ClipboardList,
    className: styles.btnComandas,
    iconClass: styles.btnIconComandas,
    badge: { value: 3, variant: styles.badgeRed },
  },
  {
    href: "/pos/cobrar",
    label: "Cobrar",
    subtitle: "Pagos pendientes",
    icon: CreditCard,
    className: styles.btnCobrar,
    iconClass: styles.btnIconCobrar,
    badge: { value: 3, variant: styles.badgeYellow },
  },
];

export default function Home() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.homeBrand}>
            <div className={styles.logoContainer}>
              <Image src="/logo-color.png" alt="SportBar" width={32} height={32} priority />
            </div>
            <div className={styles.brandText}>
              <span className={styles.homeName}>SportBar</span>
              <span className={styles.homeSub}>Sport Bar · Guaiquerías</span>
            </div>
          </div>
          <span className={styles.livePill}>
            <span className={styles.liveDot} />
            En vivo
          </span>
        </div>
      </header>

      <div className={styles.statsRow}>
        {stats.map((s) => (
          <div
            key={s.label}
            className={styles.statChip}
            style={{ "--chip-color": `var(${s.colorVar})` } as React.CSSProperties}
          >
            <span className={styles.statValue}>{s.value}</span>
            <span className={styles.statLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      <motion.nav
        className={styles.nav}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {buttons.map((btn) => {
          const Icon = btn.icon;
          return (
            <motion.div key={btn.href} variants={itemVariants} className={styles.btnWrapper}>
              <Link href={btn.href} className={`${styles.btn} ${btn.className}`}>
                <div className={`${styles.btnIcon} ${btn.iconClass}`}>
                  <Icon size={28} strokeWidth={1.8} />
                </div>
                <div className={styles.btnText}>
                  <span className={styles.btnLabel}>{btn.label}</span>
                  <span className={styles.btnSubtitle}>{btn.subtitle}</span>
                </div>
                {btn.badge && (
                  <span className={`${styles.btnBadge} ${btn.badge.variant}`}>
                    {btn.badge.value}
                  </span>
                )}
              </Link>
            </motion.div>
          );
        })}
      </motion.nav>
    </div>
  );
}
