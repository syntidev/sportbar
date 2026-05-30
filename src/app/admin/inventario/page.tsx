"use client";

import { useEffect, useState, useCallback } from "react";
import { Package, AlertTriangle, RefreshCw, Check } from "lucide-react";
import styles from "./page.module.css";

interface InventoryRow {
  product_id: number;
  name:       string;
  category:   string;
  inv_id:     number | null;
  quantity:   number;
  unit:       string;
  min_stock:  number;
  updated_at: string | null;
}

interface EditState {
  quantity:  string;
  unit:      string;
  min_stock: string;
}

const UNITS = ["unid", "kg", "g", "L", "ml", "paq", "cja", "doc"];

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit" });
}

export default function InventarioPage() {
  const [rows,    setRows]    = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<number, EditState>>({});
  const [saving,  setSaving]  = useState<Record<number, boolean>>({});
  const [saved,   setSaved]   = useState<Record<number, boolean>>({});

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/inventory");
      const data = await res.json() as { success: boolean; items: InventoryRow[]; error?: string };
      if (!data.success) throw new Error(data.error ?? "Error");
      setRows(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function startEdit(row: InventoryRow) {
    setEditing((prev) => ({
      ...prev,
      [row.product_id]: {
        quantity:  String(row.quantity),
        unit:      row.unit,
        min_stock: String(row.min_stock),
      },
    }));
  }

  function cancelEdit(pid: number) {
    setEditing((prev) => { const n = { ...prev }; delete n[pid]; return n; });
  }

  const saveRow = useCallback(async (row: InventoryRow) => {
    const draft = editing[row.product_id];
    if (!draft) return;
    const qty = parseFloat(draft.quantity);
    const min = parseFloat(draft.min_stock);
    if (isNaN(qty) || isNaN(min)) return;

    setSaving((p) => ({ ...p, [row.product_id]: true }));
    try {
      const res = await fetch("/api/inventory", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: row.product_id, quantity: qty, unit: draft.unit, min_stock: min }),
      });
      const data = await res.json() as { success: boolean };
      if (data.success) {
        setRows((prev) =>
          prev.map((r) =>
            r.product_id === row.product_id
              ? { ...r, quantity: qty, unit: draft.unit, min_stock: min, updated_at: new Date().toISOString() }
              : r,
          ),
        );
        cancelEdit(row.product_id);
        setSaved((p) => ({ ...p, [row.product_id]: true }));
        setTimeout(() => setSaved((p) => { const n = { ...p }; delete n[row.product_id]; return n; }), 1800);
      }
    } finally {
      setSaving((p) => ({ ...p, [row.product_id]: false }));
    }
  }, [editing]);

  // Group rows by category
  const grouped = rows.reduce<Record<string, InventoryRow[]>>((acc, r) => {
    const k = r.category;
    if (!acc[k]) acc[k] = [];
    acc[k].push(r);
    return acc;
  }, {});

  const lowCount = rows.filter((r) => r.quantity <= r.min_stock && r.min_stock > 0).length;

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadWrap}>
          <div className={styles.spinner} />
          <span>Cargando inventario...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.errorWrap}>
          <AlertTriangle size={28} />
          <p>{error}</p>
          <button className={styles.retryBtn} onClick={load}>Reintentar</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Package size={20} color="var(--color-primary)" />
          <h1 className={styles.title}>Inventario</h1>
          {lowCount > 0 && (
            <span className={styles.alertBadge}>
              <AlertTriangle size={12} />
              {lowCount} bajo mínimo
            </span>
          )}
        </div>
        <button className={styles.refreshBtn} onClick={load} aria-label="Recargar">
          <RefreshCw size={15} />
        </button>
      </header>

      <div className={styles.tableWrap}>
        {Object.entries(grouped).map(([cat, catRows]) => (
          <div key={cat} className={styles.catSection}>
            <div className={styles.catLabel}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.thName}>Producto</th>
                  <th className={styles.thNum}>Cantidad</th>
                  <th className={styles.thUnit}>Unidad</th>
                  <th className={styles.thNum}>Mínimo</th>
                  <th className={styles.thDate}>Actualizado</th>
                  <th className={styles.thAct}></th>
                </tr>
              </thead>
              <tbody>
                {catRows.map((row) => {
                  const isEditing = !!editing[row.product_id];
                  const isSaving  = !!saving[row.product_id];
                  const justSaved = !!saved[row.product_id];
                  const isLow     = row.min_stock > 0 && row.quantity <= row.min_stock;
                  const draft     = editing[row.product_id];

                  return (
                    <tr
                      key={row.product_id}
                      className={
                        styles.row +
                        (isLow && !isEditing ? " " + styles.rowLow : "") +
                        (isEditing ? " " + styles.rowEditing : "")
                      }
                      onClick={() => !isEditing && startEdit(row)}
                    >
                      {/* Name */}
                      <td className={styles.tdName}>
                        {isLow && !isEditing && (
                          <AlertTriangle size={12} className={styles.alertIcon} />
                        )}
                        {row.name}
                      </td>

                      {/* Quantity */}
                      <td className={styles.tdNum}>
                        {isEditing ? (
                          <input
                            className={styles.numInput}
                            type="number"
                            min="0"
                            step="0.1"
                            value={draft.quantity}
                            onChange={(e) => setEditing((p) => ({ ...p, [row.product_id]: { ...p[row.product_id], quantity: e.target.value } }))}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                          />
                        ) : (
                          <span className={isLow ? styles.numLow : styles.numOk}>
                            {row.quantity % 1 === 0 ? row.quantity : row.quantity.toFixed(2)}
                          </span>
                        )}
                      </td>

                      {/* Unit */}
                      <td className={styles.tdUnit}>
                        {isEditing ? (
                          <select
                            className={styles.unitSelect}
                            value={draft.unit}
                            onChange={(e) => setEditing((p) => ({ ...p, [row.product_id]: { ...p[row.product_id], unit: e.target.value } }))}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                          </select>
                        ) : (
                          <span className={styles.unitPill}>{row.unit}</span>
                        )}
                      </td>

                      {/* Min stock */}
                      <td className={styles.tdNum}>
                        {isEditing ? (
                          <input
                            className={styles.numInput}
                            type="number"
                            min="0"
                            step="0.1"
                            value={draft.min_stock}
                            onChange={(e) => setEditing((p) => ({ ...p, [row.product_id]: { ...p[row.product_id], min_stock: e.target.value } }))}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className={styles.numMuted}>{row.min_stock || "—"}</span>
                        )}
                      </td>

                      {/* Updated */}
                      <td className={styles.tdDate}>{fmtDate(row.updated_at)}</td>

                      {/* Actions */}
                      <td className={styles.tdAct} onClick={(e) => e.stopPropagation()}>
                        {isEditing ? (
                          <div className={styles.actRow}>
                            <button
                              className={styles.btnSave}
                              disabled={isSaving}
                              onClick={() => saveRow(row)}
                              aria-label="Guardar"
                            >
                              {isSaving ? "…" : <Check size={14} strokeWidth={2.5} />}
                            </button>
                            <button className={styles.btnCancel} onClick={() => cancelEdit(row.product_id)} aria-label="Cancelar">
                              ×
                            </button>
                          </div>
                        ) : (
                          justSaved
                            ? <Check size={14} color="var(--color-primary)" />
                            : <span className={styles.editHint}>editar</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
