"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ArrowLeft, Play, Square, Users, Trophy, Clock, AlertCircle } from "lucide-react";
import styles from "./page.module.css";

interface TurnoState {
  is_active: boolean;
  partido_nombre: string;
  opened_at: string;
  opened_by: string;
  closed_at?: string;
  meseros_activos?: string[];
}

interface MeseroUser {
  id: number;
  code: string;
  name: string;
  lastname: string;
  role: string;
  is_active: boolean;
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.28, ease: [0.25, 0, 0, 1] } }),
};

function formatElapsed(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-VE", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" });
}

export default function TurnoPage() {
  const [turno, setTurno] = useState<TurnoState | null>(null);
  const [meseros, setMeseros] = useState<MeseroUser[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [partidoNombre, setPartidoNombre] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState("");

  const fetchTurno = useCallback(async () => {
    const res = await fetch("/api/turno");
    const data = await res.json();
    if (data.success) setTurno(data.turno);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/turno").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
    ]).then(([turnoData, usersData]) => {
      if (turnoData.success) setTurno(turnoData.turno);
      if (usersData.success) {
        const list: MeseroUser[] = usersData.users.filter(
          (u: MeseroUser) => u.role === "mesero" && u.is_active
        );
        setMeseros(list);
        setSelected(new Set(list.map((u) => u.code)));
      }
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!turno?.is_active || !turno.opened_at) return;
    setElapsed(formatElapsed(turno.opened_at));
    const id = setInterval(() => setElapsed(formatElapsed(turno.opened_at)), 30_000);
    return () => clearInterval(id);
  }, [turno]);

  function toggleMesero(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  }

  async function handleOpen(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!partidoNombre.trim()) { setError("Ingresa el nombre del partido"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/turno", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partido_nombre: partidoNombre.trim(),
          opened_by: "ADM-001",
          meseros_activos: Array.from(selected),
        }),
      });
      const data = await res.json();
      if (data.success) { setTurno(data.turno); setPartidoNombre(""); }
      else setError(data.errors?.join(", ") ?? data.error ?? "Error al abrir turno");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClose() {
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/turno", { method: "DELETE" });
      const data = await res.json();
      if (data.success) setTurno(data.turno);
      else setError(data.error ?? "Error al cerrar turno");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <motion.header className={styles.header} initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <Link href="/admin" className={styles.backBtn} aria-label="Volver">
          <ArrowLeft size={16} />
        </Link>
        <div className={styles.headerText}>
          <span className={styles.pageTitle}>Turno · Partido</span>
          <span className={styles.pageSub}>Apertura y cierre de jornada</span>
        </div>
      </motion.header>

      {loading ? (
        <div className={styles.skeleton} />
      ) : (
        <>
          {/* ── Estado actual ── */}
          <motion.div
            className={`${styles.statusCard} ${turno?.is_active ? styles.open : styles.closed}`}
            initial="hidden" animate="visible" variants={fadeUp} custom={1}
          >
            <span className={`${styles.statusBadge} ${turno?.is_active ? styles.open : styles.closed}`}>
              <span className={`${styles.statusDot} ${turno?.is_active ? styles.pulse : ""}`} />
              {turno?.is_active ? "En juego" : "Cerrado"}
            </span>

            {turno?.is_active ? (
              <>
                <p className={styles.partidoNombre}>{turno.partido_nombre}</p>
                <div className={styles.metaRow}>
                  <span className={styles.metaItem}>
                    <Clock size={12} />
                    Abierto hace {elapsed} · {formatDate(turno.opened_at)}
                  </span>
                  <span className={styles.metaItem}>
                    <Users size={12} />
                    {turno.meseros_activos?.length ?? 0} mesero{(turno.meseros_activos?.length ?? 0) !== 1 ? "s" : ""} activos
                  </span>
                </div>
              </>
            ) : (
              <p className={styles.partidoNombre} style={{ color: "var(--color-text-muted)", fontSize: "1rem" }}>
                Sin partido activo
              </p>
            )}
          </motion.div>

          {error && (
            <motion.div className={styles.errorMsg} initial="hidden" animate="visible" variants={fadeUp} custom={2}>
              <AlertCircle size={14} style={{ display: "inline", marginRight: 6 }} />
              {error}
            </motion.div>
          )}

          {/* ── Cerrar turno ── */}
          {turno?.is_active && (
            <motion.button
              className={styles.btnClose}
              onClick={handleClose}
              disabled={submitting}
              initial="hidden" animate="visible" variants={fadeUp} custom={3}
            >
              <Square size={18} />
              {submitting ? "Cerrando..." : "Cerrar Turno"}
            </motion.button>
          )}

          {/* ── Abrir turno ── */}
          {!turno?.is_active && (
            <motion.form
              onSubmit={handleOpen}
              initial="hidden" animate="visible" variants={fadeUp} custom={2}
              style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}
            >
              <div className={styles.section}>
                <span className={styles.sectionTitle}>
                  <Trophy size={12} />
                  Nombre del partido
                </span>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="Guaiquerías vs Cocodrilos"
                  value={partidoNombre}
                  onChange={(e) => setPartidoNombre(e.target.value)}
                  autoComplete="off"
                />
              </div>

              {meseros.length > 0 && (
                <div className={styles.section}>
                  <span className={styles.sectionTitle}>
                    <Users size={12} />
                    Meseros activos ({selected.size}/{meseros.length})
                  </span>
                  <div className={styles.meserosList}>
                    {meseros.map((m) => {
                      const on = selected.has(m.code);
                      return (
                        <div
                          key={m.code}
                          className={`${styles.meseroRow} ${on ? styles.active : ""}`}
                          onClick={() => toggleMesero(m.code)}
                          role="checkbox"
                          aria-checked={on}
                          tabIndex={0}
                          onKeyDown={(e) => e.key === " " && toggleMesero(m.code)}
                        >
                          <div className={styles.meseroInfo}>
                            <span className={styles.meseroName}>{m.name} {m.lastname}</span>
                            <span className={styles.meseroCode}>{m.code}</span>
                          </div>
                          <div className={`${styles.toggle} ${on ? styles.on : ""}`}>
                            <div className={styles.toggleKnob} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                type="submit"
                className={styles.btnOpen}
                disabled={submitting}
              >
                <Play size={18} />
                {submitting ? "Abriendo..." : "Abrir Turno"}
              </button>
            </motion.form>
          )}
        </>
      )}
    </div>
  );
}
