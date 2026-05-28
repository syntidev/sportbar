"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Settings, RefreshCw, Check, CreditCard,
  GripVertical, Plus, Pencil, Trash2, X,
} from "lucide-react";
import Link from "next/link";
import styles from "./page.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────

type CurrencySymbol = "REF" | "$";
type CurrencyMode   = "ref_only" | "bs_only" | "both" | "hidden";
type MethodType     = "cash" | "transfer" | "mobile" | "biometric" | "other";
type TerminalMethod = "pos_debit" | "pos_credit" | "biopago";

interface PaymentMethod {
  id:         number;
  name:       string;
  type:       MethodType;
  bank_name:  string | null;
  is_active:  boolean;
  sort_order: number;
}

interface PosTerminal {
  id:                number;
  method:            TerminalMethod;
  bank_name:         string;
  serial:            string | null;
  commercial_number: string | null;
  is_active:         boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MODES: { key: CurrencyMode; label: string }[] = [
  { key: "ref_only", label: "Solo REF" },
  { key: "bs_only",  label: "Solo Bs"  },
  { key: "both",     label: "REF / Bs" },
  { key: "hidden",   label: "Ocultar"  },
];

const TYPE_LABELS: Record<MethodType, string> = {
  cash:      "Efectivo",
  transfer:  "Transferencia",
  mobile:    "Pago Móvil",
  biometric: "BioPago",
  other:     "Otro",
};

const TYPE_COLORS: Record<MethodType, string> = {
  cash:      "var(--color-listo)",
  transfer:  "#3b82f6",
  mobile:    "#a855f7",
  biometric: "var(--color-brand)",
  other:     "var(--color-text-muted)",
};

const TERMINAL_LABELS: Record<TerminalMethod, string> = {
  pos_debit:  "Débito",
  pos_credit: "Crédito",
  biopago:    "BioPago",
};

const TERMINAL_METHODS: { value: TerminalMethod; label: string }[] = [
  { value: "pos_debit",  label: "Débito"  },
  { value: "pos_credit", label: "Crédito" },
  { value: "biopago",    label: "BioPago" },
];

const BANCOS = [
  "Banco de Venezuela", "Banco del Tesoro", "BANFANB", "Banco Agrícola de Venezuela",
  "Banesco", "Mercantil", "BBVA Provincial", "Bancamiga", "BNC", "Bancaribe",
  "Banplus", "Banco Plaza", "Banco Exterior", "BFC", "Venezolano de Crédito",
  "100% Banco", "Banco Activo", "Banco Caroní", "Delsur", "Sofitasa",
  "Bancrecer", "Mi Banco", "Fondo Común", "BOD", "Bicentenario",
];

const NEEDS_BANK: MethodType[] = ["mobile", "biometric", "transfer"];

const M_INIT = { name: "", type: "cash" as MethodType, bank_name: "" };
const T_INIT = {
  method: "pos_debit" as TerminalMethod,
  bank_name: "", serial: "", commercial_number: "", is_active: true,
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminConfigPage() {
  // Currency
  const [loading,       setLoading]       = useState(true);
  const [symbol,        setSymbol]        = useState<CurrencySymbol>("REF");
  const [mode,          setMode]          = useState<CurrencyMode>("both");
  const [rate,          setRate]          = useState(50.0);
  const [rateUpdatedAt, setRateUpdatedAt] = useState<string | null>(null);
  const [autoSync,      setAutoSync]      = useState(false);
  const [rateInput,     setRateInput]     = useState("");
  const [rateUpdating,  setRateUpdating]  = useState(false);
  const [toast,         setToast]         = useState<string | null>(null);

  // Payment methods
  const [methods,    setMethods]    = useState<PaymentMethod[]>([]);
  const [dragging,   setDragging]   = useState<number | null>(null);
  const [showMethod, setShowMethod] = useState(false);
  const [editMethod, setEditMethod] = useState<PaymentMethod | null>(null);
  const [mForm,      setMForm]      = useState(M_INIT);
  const [mSaving,    setMSaving]    = useState(false);

  // Terminals
  const [terminals,    setTerminals]    = useState<PosTerminal[]>([]);
  const [showTerminal, setShowTerminal] = useState(false);
  const [editTerminal, setEditTerminal] = useState<PosTerminal | null>(null);
  const [tForm,        setTForm]        = useState(T_INIT);
  const [tSaving,      setTSaving]      = useState(false);

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

  // ── Load ──────────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      try {
        const [cfgRes, rateRes, mRes, tRes] = await Promise.all([
          fetch("/api/config"),
          fetch("/api/currency"),
          fetch("/api/payment-methods"),
          fetch("/api/terminals"),
        ]);
        const [cfgData, rateData, mData, tData] = await Promise.all([
          cfgRes.json(), rateRes.json(), mRes.json(), tRes.json(),
        ]) as [
          { success: boolean; config: Record<string, string> },
          { rate?: number; updated_at?: string },
          { methods?: PaymentMethod[] },
          { terminals?: PosTerminal[] },
        ];

        if (cfgData.success) {
          const c = cfgData.config;
          if (c.currency_symbol) setSymbol(c.currency_symbol as CurrencySymbol);
          if (c.currency_mode)   setMode(c.currency_mode as CurrencyMode);
          if (c.rate_sync_auto)  setAutoSync(c.rate_sync_auto === "true");
        }
        if (rateData.rate)       { setRate(rateData.rate); setRateInput(String(rateData.rate)); }
        if (rateData.updated_at) setRateUpdatedAt(rateData.updated_at);
        if (mData.methods)       setMethods(mData.methods);
        if (tData.terminals)     setTerminals(tData.terminals);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Currency ──────────────────────────────────────────────────────────────────

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

  // ── Payment methods ───────────────────────────────────────────────────────────

  function openNewMethod() {
    setEditMethod(null);
    setMForm(M_INIT);
    setShowMethod(true);
  }

  function openEditMethod(m: PaymentMethod) {
    setEditMethod(m);
    setMForm({ name: m.name, type: m.type, bank_name: m.bank_name ?? "" });
    setShowMethod(true);
  }

  async function handleSaveMethod() {
    if (!mForm.name.trim()) return;
    setMSaving(true);
    try {
      const body = {
        name:      mForm.name.trim(),
        type:      mForm.type,
        bank_name: NEEDS_BANK.includes(mForm.type) ? (mForm.bank_name || null) : null,
      };
      const res = editMethod
        ? await fetch(`/api/payment-methods/${editMethod.id}`, { method: "PUT",  headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        : await fetch("/api/payment-methods",                   { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json() as { success: boolean; methods?: PaymentMethod[] };
      if (data.success && data.methods) {
        setMethods(data.methods);
        setShowMethod(false);
        showToast(editMethod ? "Método actualizado" : "Método creado");
      }
    } finally {
      setMSaving(false);
    }
  }

  async function handleToggleMethod(m: PaymentMethod) {
    const res  = await fetch(`/api/payment-methods/${m.id}/toggle`, { method: "PATCH" });
    const data = await res.json() as { success: boolean; methods?: PaymentMethod[] };
    if (data.success && data.methods) setMethods(data.methods);
  }

  async function handleDeleteMethod(m: PaymentMethod) {
    if (!confirm(`¿Eliminar "${m.name}"?`)) return;
    const res  = await fetch(`/api/payment-methods/${m.id}`, { method: "DELETE" });
    const data = await res.json() as { success: boolean; methods?: PaymentMethod[] };
    if (data.success && data.methods) { setMethods(data.methods); showToast("Método eliminado"); }
  }

  // ── Drag & drop ───────────────────────────────────────────────────────────────

  function onDragStart(i: number) { setDragging(i); }

  function onDragOver(i: number) {
    if (dragging === null || dragging === i) return;
    const moved = [...methods];
    const [item] = moved.splice(dragging, 1);
    moved.splice(i, 0, item);
    setMethods(moved);
    setDragging(i);
  }

  async function onDragEnd() {
    setDragging(null);
    await fetch("/api/payment-methods/reorder", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ order: methods.map((m) => m.id) }),
    });
  }

  // ── Terminals ─────────────────────────────────────────────────────────────────

  function openNewTerminal() {
    setEditTerminal(null);
    setTForm(T_INIT);
    setShowTerminal(true);
  }

  function openEditTerminal(t: PosTerminal) {
    setEditTerminal(t);
    setTForm({
      method:            t.method,
      bank_name:         t.bank_name,
      serial:            t.serial ?? "",
      commercial_number: t.commercial_number ?? "",
      is_active:         t.is_active,
    });
    setShowTerminal(true);
  }

  async function handleSaveTerminal() {
    if (!tForm.bank_name.trim()) return;
    setTSaving(true);
    try {
      const res = editTerminal
        ? await fetch(`/api/terminals/${editTerminal.id}`, { method: "PUT",  headers: { "Content-Type": "application/json" }, body: JSON.stringify(tForm) })
        : await fetch("/api/terminals",                    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(tForm) });
      const data = await res.json() as { success: boolean; terminals?: PosTerminal[] };
      if (data.success && data.terminals) {
        setTerminals(data.terminals);
        setShowTerminal(false);
        showToast(editTerminal ? "Dispositivo actualizado" : "Dispositivo agregado");
      }
    } finally {
      setTSaving(false);
    }
  }

  async function handleDeleteTerminal(t: PosTerminal) {
    if (!confirm(`¿Eliminar "${t.bank_name} – ${TERMINAL_LABELS[t.method]}"?`)) return;
    const res  = await fetch(`/api/terminals/${t.id}`, { method: "DELETE" });
    const data = await res.json() as { success: boolean; terminals?: PosTerminal[] };
    if (data.success && data.terminals) { setTerminals(data.terminals); showToast("Dispositivo eliminado"); }
  }

  function fmtDate(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("es-VE", {
      day: "2-digit", month: "2-digit", year: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────────

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
        <Link href="/admin" className={styles.backBtn}><ArrowLeft size={16} /></Link>
        <div className={styles.headerText}>
          <span className={styles.pageTitle}>Configuración</span>
          <span className={styles.pageSub}>Moneda · Cobros · Dispositivos</span>
        </div>
        <Settings size={18} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
      </header>

      {/* ── Moneda ── */}
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
                <button key={s} className={`${styles.pill} ${symbol === s ? styles.pillActive : ""}`} onClick={() => handleSymbol(s)}>{s}</button>
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
                <button key={key} className={`${styles.pill} ${mode === key ? styles.pillActive : ""}`} onClick={() => handleMode(key)}>{label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tasa BCV ── */}
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
              <div className={`${styles.toggle} ${autoSync ? styles.on : ""}`}><div className={styles.toggleKnob} /></div>
            </button>
          </div>
          <div className={styles.rateRow}>
            <input
              className={styles.rateInput}
              type="number" min="0" step="0.01" placeholder="Ej: 50.50"
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

      {/* ── Métodos de pago ── */}
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <span className={styles.sectionTitle}>Cobros</span>
            <p className={styles.sectionHint}>Arrastra para reordenar · se muestran en el POS al cobrar</p>
          </div>
          <button className={styles.btnBrand} onClick={openNewMethod}>
            <Plus size={14} />
            Nuevo método
          </button>
        </div>
        <div className={styles.sectionCard}>
          {methods.length === 0 && <p className={styles.empty}>Sin métodos. Crea el primero.</p>}
          {methods.map((m, i) => (
            <div
              key={m.id}
              className={`${styles.methodRow} ${!m.is_active ? styles.rowDim : ""} ${dragging === i ? styles.rowDrag : ""}`}
              draggable
              onDragStart={() => onDragStart(i)}
              onDragOver={(e) => { e.preventDefault(); onDragOver(i); }}
              onDragEnd={onDragEnd}
            >
              <GripVertical size={14} className={styles.dragHandle} />
              <span
                className={styles.badge}
                style={{ background: `color-mix(in srgb, ${TYPE_COLORS[m.type]} 15%, transparent)`, color: TYPE_COLORS[m.type] }}
              >
                {TYPE_LABELS[m.type]}
              </span>
              <div className={styles.methodInfo}>
                <span className={styles.methodName}>{m.name}</span>
                {m.bank_name && <span className={styles.methodBank}>{m.bank_name}</span>}
              </div>
              <div className={styles.rowActions}>
                <button
                  className={`${styles.toggleBtn} ${m.is_active ? styles.togOn : styles.togOff}`}
                  onClick={() => handleToggleMethod(m)}
                  title={m.is_active ? "Desactivar" : "Activar"}
                >
                  <div className={styles.toggleKnobSm} />
                </button>
                <button className={styles.btnAct} onClick={() => openEditMethod(m)} title="Editar">
                  <Pencil size={12} />
                </button>
                <button className={`${styles.btnAct} ${styles.btnActDanger}`} onClick={() => handleDeleteMethod(m)} title="Eliminar">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Dispositivos ── */}
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <span className={styles.sectionTitle}>Dispositivos</span>
            <p className={styles.sectionHint}>Terminales POS y equipos de cobro</p>
          </div>
          <button className={styles.btnBrand} onClick={openNewTerminal}>
            <Plus size={14} />
            Nuevo dispositivo
          </button>
        </div>
        <div className={styles.sectionCard}>
          {terminals.length === 0 && <p className={styles.empty}>Sin dispositivos. Agrega tu primer terminal.</p>}
          {terminals.map((t) => (
            <div key={t.id} className={styles.terminalRow}>
              <div className={styles.terminalIcon}>
                <CreditCard size={14} />
              </div>
              <div className={styles.terminalInfo}>
                <div className={styles.terminalTop}>
                  <span className={styles.terminalBank}>{t.bank_name}</span>
                  <span className={styles.terminalType}>{TERMINAL_LABELS[t.method]}</span>
                  {!t.is_active && <span className={styles.badgeOff}>Inactivo</span>}
                </div>
                {(t.serial || t.commercial_number) && (
                  <div className={styles.terminalMeta}>
                    {t.serial            && <span>Serial: {t.serial}</span>}
                    {t.commercial_number && <span>Comercio: {t.commercial_number}</span>}
                  </div>
                )}
              </div>
              <div className={styles.rowActions}>
                <button className={styles.btnAct} onClick={() => openEditTerminal(t)} title="Editar"><Pencil size={12} /></button>
                <button className={`${styles.btnAct} ${styles.btnActDanger}`} onClick={() => handleDeleteTerminal(t)} title="Eliminar"><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Modal: método de pago ── */}
      <AnimatePresence>
        {showMethod && (
          <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowMethod(false)}
          >
            <motion.div
              className={styles.modal}
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <span className={styles.modalTitle}>{editMethod ? "Editar método" : "Nuevo método de pago"}</span>
                <button className={styles.modalClose} onClick={() => setShowMethod(false)}><X size={16} /></button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Nombre</span>
                  <input
                    className={styles.input}
                    value={mForm.name}
                    onChange={(e) => setMForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Ej. Pago Móvil BDV"
                    maxLength={80}
                    autoFocus
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Tipo</span>
                  <select
                    className={styles.input}
                    value={mForm.type}
                    onChange={(e) => setMForm((p) => ({ ...p, type: e.target.value as MethodType, bank_name: "" }))}
                  >
                    <option value="cash">Efectivo</option>
                    <option value="transfer">Transferencia</option>
                    <option value="mobile">Pago Móvil</option>
                    <option value="biometric">BioPago</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
                {NEEDS_BANK.includes(mForm.type) && (
                  <div className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>Banco</span>
                    <select
                      className={styles.input}
                      value={mForm.bank_name}
                      onChange={(e) => setMForm((p) => ({ ...p, bank_name: e.target.value }))}
                    >
                      <option value="">Selecciona un banco</option>
                      {BANCOS.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className={styles.modalFooter}>
                <button className={styles.btnCancel} onClick={() => setShowMethod(false)}>Cancelar</button>
                <button
                  className={styles.btnSave}
                  onClick={handleSaveMethod}
                  disabled={mSaving || !mForm.name.trim()}
                >
                  {mSaving ? "Guardando..." : editMethod ? "Guardar" : "Crear método"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal: dispositivo ── */}
      <AnimatePresence>
        {showTerminal && (
          <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowTerminal(false)}
          >
            <motion.div
              className={styles.modal}
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <span className={styles.modalTitle}>{editTerminal ? "Editar dispositivo" : "Nuevo dispositivo"}</span>
                <button className={styles.modalClose} onClick={() => setShowTerminal(false)}><X size={16} /></button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Tipo</span>
                  <div className={styles.modeGroup}>
                    {TERMINAL_METHODS.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        className={`${styles.modeOpt} ${tForm.method === m.value ? styles.modeOptOn : ""}`}
                        onClick={() => setTForm((p) => ({ ...p, method: m.value }))}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Banco *</span>
                  <select
                    className={styles.input}
                    value={tForm.bank_name}
                    onChange={(e) => setTForm((p) => ({ ...p, bank_name: e.target.value }))}
                  >
                    <option value="">Selecciona un banco</option>
                    {BANCOS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className={styles.fieldRow}>
                  <div className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>Serial</span>
                    <input
                      className={styles.input}
                      value={tForm.serial}
                      onChange={(e) => setTForm((p) => ({ ...p, serial: e.target.value }))}
                      placeholder="Ej: 123456"
                    />
                  </div>
                  <div className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>Nro. comercio</span>
                    <input
                      className={styles.input}
                      value={tForm.commercial_number}
                      onChange={(e) => setTForm((p) => ({ ...p, commercial_number: e.target.value }))}
                      placeholder="Ej: 789012"
                    />
                  </div>
                </div>
                <label className={styles.toggleRow}>
                  <input
                    type="checkbox"
                    className={styles.srOnly}
                    checked={tForm.is_active}
                    onChange={(e) => setTForm((p) => ({ ...p, is_active: e.target.checked }))}
                  />
                  <div className={`${styles.togglePill} ${tForm.is_active ? styles.pillOn : ""}`}>
                    <div className={styles.pillThumb} />
                  </div>
                  <span>Dispositivo activo</span>
                </label>
              </div>
              <div className={styles.modalFooter}>
                <button className={styles.btnCancel} onClick={() => setShowTerminal(false)}>Cancelar</button>
                <button
                  className={styles.btnSave}
                  onClick={handleSaveTerminal}
                  disabled={tSaving || !tForm.bank_name.trim()}
                >
                  {tSaving ? "Guardando..." : editTerminal ? "Guardar" : "Agregar dispositivo"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
