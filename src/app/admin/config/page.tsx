"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Settings, RefreshCw, Smartphone, Banknote,
  CreditCard, Bitcoin, Coins, Check, Save, Zap,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import styles from "./page.module.css";

type CurrencySymbol = "REF" | "$";
type CurrencyMode   = "ref_only" | "bs_only" | "both" | "hidden";
type PayMethod      = "pago_movil" | "efectivo" | "punto" | "zelle" | "binance" | "usdt";

interface PayData {
  pago_movil?: { banco: string; telefono: string; titular: string; cedula: string };
  zelle?:      { correo: string; titular: string };
  binance?:    { id: string; titular: string };
  punto?:      { banco: string };
  usdt?:       { red: string; direccion: string };
}

const BANCOS = [
  "Banesco", "Venezuela", "Mercantil", "Provincial (BBVA)", "BOD",
  "Bicentenario", "Sofitasa", "Bancrecer", "BNC", "Banplus",
  "Mi Banco", "Fondo Común", "Exterior", "Tesoro",
];

const MODES: { key: CurrencyMode; label: string }[] = [
  { key: "ref_only", label: "Solo REF" },
  { key: "bs_only",  label: "Solo Bs"  },
  { key: "both",     label: "REF / Bs" },
  { key: "hidden",   label: "Ocultar"  },
];

const PAY_METHODS: { key: PayMethod; label: string; Icon: LucideIcon }[] = [
  { key: "pago_movil", label: "Pago Móvil",    Icon: Smartphone },
  { key: "efectivo",   label: "Efectivo",       Icon: Banknote   },
  { key: "punto",      label: "Punto de Venta", Icon: CreditCard },
  { key: "zelle",      label: "Zelle",          Icon: Zap        },
  { key: "binance",    label: "Binance",        Icon: Bitcoin    },
  { key: "usdt",       label: "USDT",           Icon: Coins      },
];

export default function AdminConfigPage() {
  const [loading,       setLoading]       = useState(true);
  const [symbol,        setSymbol]        = useState<CurrencySymbol>("REF");
  const [mode,          setMode]          = useState<CurrencyMode>("both");
  const [rate,          setRate]          = useState(50.0);
  const [rateUpdatedAt, setRateUpdatedAt] = useState<string | null>(null);
  const [autoSync,      setAutoSync]      = useState(false);
  const [payMethods,    setPayMethods]    = useState<Set<PayMethod>>(new Set<PayMethod>(["pago_movil", "efectivo"]));
  const [payData,       setPayData]       = useState<PayData>({});
  const [rateInput,     setRateInput]     = useState("");
  const [rateUpdating,  setRateUpdating]  = useState(false);
  const [payDataSaving, setPayDataSaving] = useState(false);
  const [toast,         setToast]         = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  const saveConfig = useCallback(async (key: string, value: string) => {
    await fetch("/api/config", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ key, value }),
    });
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const [cfgRes, rateRes] = await Promise.all([
          fetch("/api/config"),
          fetch("/api/currency"),
        ]);
        const [cfgData, rateData] = await Promise.all([cfgRes.json(), rateRes.json()]);

        if (cfgData.success) {
          const c = cfgData.config as Record<string, string>;
          if (c.currency_symbol) setSymbol(c.currency_symbol as CurrencySymbol);
          if (c.currency_mode)   setMode(c.currency_mode as CurrencyMode);
          if (c.rate_sync_auto)  setAutoSync(c.rate_sync_auto === "true");
          if (c.payment_methods) {
            try { setPayMethods(new Set(JSON.parse(c.payment_methods) as PayMethod[])); } catch { /* skip */ }
          }
          if (c.payment_data) {
            try { setPayData(JSON.parse(c.payment_data) as PayData); } catch { /* skip */ }
          }
        }

        if (rateData.rate)       { setRate(rateData.rate); setRateInput(String(rateData.rate)); }
        if (rateData.updated_at)   setRateUpdatedAt(rateData.updated_at as string);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSymbol(val: CurrencySymbol) {
    setSymbol(val);
    await saveConfig("currency_symbol", val);
    showToast("Símbolo actualizado");
  }

  async function handleMode(val: CurrencyMode) {
    setMode(val);
    await saveConfig("currency_mode", val);
    showToast("Modo actualizado");
  }

  async function handleAutoSync(val: boolean) {
    setAutoSync(val);
    await saveConfig("rate_sync_auto", String(val));
    showToast(val ? "Sync automático activado" : "Sync desactivado");
  }

  async function handleRateUpdate() {
    const n = parseFloat(rateInput);
    if (!n || n <= 0) return;
    setRateUpdating(true);
    try {
      const res  = await fetch("/api/currency/manual", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ rate: n }),
      });
      const data = await res.json() as { success: boolean; updated_at?: string };
      if (data.success) {
        setRate(n);
        setRateUpdatedAt(data.updated_at ?? new Date().toISOString());
        showToast("Tasa actualizada");
      }
    } finally {
      setRateUpdating(false);
    }
  }

  async function handlePayMethod(method: PayMethod) {
    const next = new Set(payMethods);
    if (next.has(method)) next.delete(method); else next.add(method);
    setPayMethods(next);
    await saveConfig("payment_methods", JSON.stringify(Array.from(next)));
    showToast("Métodos actualizados");
  }

  async function handleSavePayData() {
    setPayDataSaving(true);
    try {
      const res = await fetch("/api/config/payment-data", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payData),
      });
      if (res.ok) showToast("Datos de cobro guardados");
    } finally {
      setPayDataSaving(false);
    }
  }

  function patchPayData(method: keyof PayData, patch: Record<string, string>) {
    setPayData((prev) => ({
      ...prev,
      [method]: { ...(prev[method] as Record<string, string> ?? {}), ...patch },
    }));
  }

  function fmtDate(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("es-VE", {
      day: "2-digit", month: "2-digit", year: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <Link href="/admin" className={styles.backBtn}>
          <ArrowLeft size={16} />
        </Link>
        <div className={styles.headerText}>
          <span className={styles.pageTitle}>Configuración</span>
          <span className={styles.pageSub}>Moneda · Tasa · Pagos</span>
        </div>
        <Settings size={18} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
      </header>

      {/* ── Sección 1: Moneda ── */}
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Moneda</span>
        <div className={styles.sectionCard}>
          <div className={styles.row}>
            <div className={styles.rowInfo}>
              <span className={styles.rowLabel}>Símbolo de referencia</span>
              <span className={styles.rowSub}>Se muestra en tickets y pantallas</span>
            </div>
            <div className={styles.pillGroup}>
              {(["REF", "$"] as CurrencySymbol[]).map((s) => (
                <button
                  key={s}
                  className={`${styles.pill} ${symbol === s ? styles.pillActive : ""}`}
                  onClick={() => handleSymbol(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.row}>
            <div className={styles.rowInfo}>
              <span className={styles.rowLabel}>Modo de precio</span>
              <span className={styles.rowSub}>Cómo se muestran los importes</span>
            </div>
            <div className={styles.pillGroup}>
              {MODES.map(({ key, label }) => (
                <button
                  key={key}
                  className={`${styles.pill} ${mode === key ? styles.pillActive : ""}`}
                  onClick={() => handleMode(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Sección 2: Tasa BCV ── */}
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Tasa BCV</span>
        <div className={styles.sectionCard}>
          <div className={styles.rateDisplay}>
            <span className={styles.rateValue}>Bs. {rate.toFixed(2)}</span>
            <span className={styles.rateLabel}>por REF</span>
            <span className={styles.rateTimestamp}>Actualizado: {fmtDate(rateUpdatedAt)}</span>
          </div>
          <div className={styles.row}>
            <div className={styles.rowInfo}>
              <span className={styles.rowLabel}>Sync automático</span>
              <span className={styles.rowSub}>Actualiza la tasa desde el VPS</span>
            </div>
            <button className={styles.toggleWrap} onClick={() => handleAutoSync(!autoSync)}>
              <div className={`${styles.toggle} ${autoSync ? styles.on : ""}`}>
                <div className={styles.toggleKnob} />
              </div>
            </button>
          </div>
          <div className={styles.rateRow}>
            <input
              className={styles.rateInput}
              type="number"
              min="0"
              step="0.01"
              placeholder="Ej: 50.50"
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
            />
            <button
              className={styles.btnSaveRate}
              onClick={handleRateUpdate}
              disabled={rateUpdating || !rateInput || parseFloat(rateInput) <= 0}
            >
              <RefreshCw size={14} />
              {rateUpdating ? "Actualizando..." : "Actualizar tasa"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Sección 3: Métodos de pago ── */}
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Métodos de pago activos</span>
        <div className={styles.sectionCard}>
          {PAY_METHODS.map(({ key, label, Icon }) => (
            <div
              key={key}
              className={`${styles.checkRow} ${payMethods.has(key) ? styles.checkRowActive : ""}`}
              onClick={() => handlePayMethod(key)}
            >
              <div className={styles.checkRowLeft}>
                <div className={`${styles.checkIcon} ${payMethods.has(key) ? styles.checkIconActive : ""}`}>
                  <Icon size={14} />
                </div>
                <span className={styles.checkLabel}>{label}</span>
              </div>
              <div className={`${styles.checkbox} ${payMethods.has(key) ? styles.checked : ""}`}>
                {payMethods.has(key) && <Check size={11} strokeWidth={3} color="#fff" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Sección 4: Datos de cobro ── */}
      {payMethods.size > 0 && (
        <div className={styles.section}>
          <span className={styles.sectionTitle}>Datos de cobro</span>
          <div className={styles.sectionCard}>

            {payMethods.has("pago_movil") && (
              <div className={styles.payDataBlock}>
                <span className={styles.payDataTitle}><Smartphone size={11} /> Pago Móvil</span>
                <select
                  className={styles.select}
                  value={payData.pago_movil?.banco ?? ""}
                  onChange={(e) => patchPayData("pago_movil", { banco: e.target.value })}
                >
                  <option value="">Seleccionar banco</option>
                  {BANCOS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
                <input
                  className={styles.input}
                  placeholder="Teléfono (04XX...)"
                  value={payData.pago_movil?.telefono ?? ""}
                  onChange={(e) => patchPayData("pago_movil", { telefono: e.target.value })}
                />
                <input
                  className={styles.input}
                  placeholder="Titular"
                  value={payData.pago_movil?.titular ?? ""}
                  onChange={(e) => patchPayData("pago_movil", { titular: e.target.value })}
                />
                <input
                  className={styles.input}
                  placeholder="Cédula (V-12345678)"
                  value={payData.pago_movil?.cedula ?? ""}
                  onChange={(e) => patchPayData("pago_movil", { cedula: e.target.value })}
                />
              </div>
            )}

            {payMethods.has("zelle") && (
              <div className={styles.payDataBlock}>
                <span className={styles.payDataTitle}><Zap size={11} /> Zelle</span>
                <input
                  className={styles.input}
                  placeholder="Correo electrónico"
                  value={payData.zelle?.correo ?? ""}
                  onChange={(e) => patchPayData("zelle", { correo: e.target.value })}
                />
                <input
                  className={styles.input}
                  placeholder="Titular"
                  value={payData.zelle?.titular ?? ""}
                  onChange={(e) => patchPayData("zelle", { titular: e.target.value })}
                />
              </div>
            )}

            {payMethods.has("binance") && (
              <div className={styles.payDataBlock}>
                <span className={styles.payDataTitle}><Bitcoin size={11} /> Binance</span>
                <input
                  className={styles.input}
                  placeholder="ID o correo Binance"
                  value={payData.binance?.id ?? ""}
                  onChange={(e) => patchPayData("binance", { id: e.target.value })}
                />
                <input
                  className={styles.input}
                  placeholder="Titular"
                  value={payData.binance?.titular ?? ""}
                  onChange={(e) => patchPayData("binance", { titular: e.target.value })}
                />
              </div>
            )}

            {payMethods.has("punto") && (
              <div className={styles.payDataBlock}>
                <span className={styles.payDataTitle}><CreditCard size={11} /> Punto de Venta</span>
                <select
                  className={styles.select}
                  value={payData.punto?.banco ?? ""}
                  onChange={(e) => patchPayData("punto", { banco: e.target.value })}
                >
                  <option value="">Seleccionar banco</option>
                  {BANCOS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            )}

            {payMethods.has("usdt") && (
              <div className={styles.payDataBlock}>
                <span className={styles.payDataTitle}><Coins size={11} /> USDT</span>
                <input
                  className={styles.input}
                  placeholder="Red (TRC20, ERC20...)"
                  value={payData.usdt?.red ?? ""}
                  onChange={(e) => patchPayData("usdt", { red: e.target.value })}
                />
                <input
                  className={styles.input}
                  placeholder="Dirección de wallet"
                  value={payData.usdt?.direccion ?? ""}
                  onChange={(e) => patchPayData("usdt", { direccion: e.target.value })}
                />
              </div>
            )}

            {payMethods.has("efectivo") && (
              <div className={styles.payDataBlock}>
                <span className={styles.payDataTitle}><Banknote size={11} /> Efectivo</span>
                <span className={styles.payDataNote}>Sin datos adicionales requeridos.</span>
              </div>
            )}

            <div className={styles.payDataFooter}>
              <button
                className={styles.btnSaveData}
                onClick={handleSavePayData}
                disabled={payDataSaving}
              >
                <Save size={14} />
                {payDataSaving ? "Guardando..." : "Guardar datos de cobro"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className={styles.toast}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
          >
            <Check size={12} />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
