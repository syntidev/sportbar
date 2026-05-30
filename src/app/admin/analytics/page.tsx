"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Eye, QrCode, ShoppingBag, TrendingUp, RefreshCw } from "lucide-react";
import styles from "./page.module.css";

interface AnalyticsData {
  visitas_hoy: number;
  visitas_7d: number;
  qr_scans_7d: number;
  ordenes_pub_7d: number;
  last_7_days: { date: string; page_view: number; qr_scan: number; order_placed: number }[];
  zone_data: { zone: string; count: number }[];
}

const ZONE_COLORS = ["#2E7D32", "#F5A623", "#C62828", "#7C4DFF", "#4CAF50"];

function kpiLabel(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load(showRefresh = false) {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analytics/data");
      if (!res.ok) throw new Error("Error cargando datos");
      const json = (await res.json()) as AnalyticsData;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadWrap}>
          <div className={styles.spinner} />
          <span>Cargando datos...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.page}>
        <div className={styles.errorWrap}>
          <TrendingUp size={32} />
          <p>{error ?? "Sin datos"}</p>
          <button className={styles.retryBtn} onClick={() => load()}>Reintentar</button>
        </div>
      </div>
    );
  }

  const kpis = [
    { label: "Visitas hoy",   value: kpiLabel(data.visitas_hoy),   icon: Eye,         color: "var(--color-primary)" },
    { label: "Visitas 7 días", value: kpiLabel(data.visitas_7d),   icon: TrendingUp,  color: "var(--color-brand)" },
    { label: "Escaneos QR",   value: kpiLabel(data.qr_scans_7d),  icon: QrCode,      color: "#7C4DFF" },
    { label: "Órdenes PUB",   value: kpiLabel(data.ordenes_pub_7d), icon: ShoppingBag, color: "var(--color-accent)" },
  ];

  const chartData = data.last_7_days.map((d) => ({
    name: d.date.slice(5), // MM-DD
    Visitas: d.page_view,
    QR: d.qr_scan,
    Órdenes: d.order_placed,
  }));

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <TrendingUp size={22} />
          <h1 className={styles.title}>Pulso del Negocio</h1>
        </div>
        <button
          className={styles.refreshBtn}
          onClick={() => load(true)}
          disabled={refreshing}
          aria-label="Actualizar datos"
        >
          <RefreshCw size={16} className={refreshing ? styles.spinning : ""} />
          <span>{refreshing ? "Actualizando…" : "Actualizar"}</span>
        </button>
      </header>

      {/* KPI Cards */}
      <section className={styles.kpiGrid}>
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={styles.kpiCard} style={{ "--kpi-color": color } as React.CSSProperties}>
            <div className={styles.kpiIcon}>
              <Icon size={20} />
            </div>
            <div className={styles.kpiBody}>
              <span className={styles.kpiValue}>{value}</span>
              <span className={styles.kpiLabel}>{label}</span>
            </div>
          </div>
        ))}
      </section>

      {/* Bar chart — last 7 days */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Actividad — últimos 7 días</h2>
        <div className={styles.chartWrap}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "var(--color-text)" }}
                itemStyle={{ color: "var(--color-text-muted)" }}
              />
              <Bar dataKey="Visitas" fill="var(--color-primary)" radius={[3, 3, 0, 0]} maxBarSize={28} />
              <Bar dataKey="QR"      fill="#7C4DFF"              radius={[3, 3, 0, 0]} maxBarSize={28} />
              <Bar dataKey="Órdenes" fill="var(--color-brand)"   radius={[3, 3, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
          <div className={styles.chartLegend}>
            <span className={styles.legendDot} style={{ background: "var(--color-primary)" }} />Visitas
            <span className={styles.legendDot} style={{ background: "#7C4DFF" }} />QR
            <span className={styles.legendDot} style={{ background: "var(--color-brand)" }} />Órdenes
          </div>
        </div>
      </section>

      {/* Zone distribution */}
      {data.zone_data.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Distribución por zona</h2>
          <div className={styles.zoneGrid}>
            <div className={styles.pieWrap}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data.zone_data}
                    dataKey="count"
                    nameKey="zone"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {data.zone_data.map((_, i) => (
                      <Cell key={i} fill={ZONE_COLORS[i % ZONE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
                  />
                  <Legend
                    formatter={(value) => <span style={{ color: "var(--color-text-muted)", fontSize: 12 }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.zoneTable}>
              {data.zone_data.map(({ zone, count }, i) => (
                <div key={zone} className={styles.zoneRow}>
                  <span className={styles.zoneDot} style={{ background: ZONE_COLORS[i % ZONE_COLORS.length] }} />
                  <span className={styles.zoneName}>{zone ?? "—"}</span>
                  <span className={styles.zoneCount}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
