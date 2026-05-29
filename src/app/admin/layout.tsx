'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Clock, Banknote, UtensilsCrossed,
  Users, Building2, Settings, CalendarDays, UserSquare2,
  TrendingUp,
} from 'lucide-react'
import styles from './layout.module.css'

// ── Nav items ─────────────────────────────────────────────────────────────────

const NAV = [
  { href: '/admin',             label: 'Mission Control', short: 'Control', Icon: LayoutDashboard },
  { href: '/admin/turno',       label: 'Turno',           short: 'Turno',   Icon: Clock           },
  { href: '/admin/caja',        label: 'Caja',            short: 'Caja',    Icon: Banknote        },
  { href: '/admin/menu',        label: 'Menú',            short: 'Menú',    Icon: UtensilsCrossed },
  { href: '/admin/equipo',      label: 'Equipo',          short: 'Equipo',  Icon: Users           },
  { href: '/admin/estructura',  label: 'Estructura',      short: 'Estruc.', Icon: Building2       },
  { href: '/admin/config',      label: 'Config',          short: 'Config',  Icon: Settings        },
  { href: '/admin/partido',     label: 'Partidos',        short: 'Partido', Icon: CalendarDays    },
  { href: '/admin/perfil',      label: 'Perfil',          short: 'Perfil',  Icon: UserSquare2     },
] as const

// ── Types ─────────────────────────────────────────────────────────────────────

interface ShellData {
  businessName: string
  logoUrl:      string
  userCode:     string
  bcvRate:      number | null
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const [data, setData] = useState<ShellData>({
    businessName: 'Sport Bar',
    logoUrl:      '',
    userCode:     '—',
    bcvRate:      null,
  })

  // Scroll active bottom-nav item into view on route change
  const activeBottomRef = useRef<HTMLAnchorElement | null>(null)

  useEffect(() => {
    activeBottomRef.current?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [pathname])

  // Load header data
  useEffect(() => {
    Promise.allSettled([
      fetch('/api/config/business').then((r) => r.json()),
      fetch('/api/auth/me').then((r) => r.json()),
      fetch('/api/currency').then((r) => r.json()),
    ]).then(([biz, me, cur]) => {
      setData({
        businessName:
          biz.status === 'fulfilled'
            ? (biz.value?.profile?.business_name ?? 'Sport Bar')
            : 'Sport Bar',
        logoUrl:
          biz.status === 'fulfilled'
            ? (biz.value?.profile?.business_logo_url ?? '')
            : '',
        userCode:
          me.status === 'fulfilled'
            ? (me.value?.user?.code ?? '—')
            : '—',
        bcvRate:
          cur.status === 'fulfilled'
            ? (typeof cur.value?.rate === 'number' ? cur.value.rate : null)
            : null,
      })
    })
  }, [])

  // Active link: exact match for /admin, startsWith for the rest
  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  // ── Shared sub-components ─────────────────────────────────────────────────

  function LogoDesktop() {
    return data.logoUrl ? (
      <img src={data.logoUrl} alt="Logo" className={styles.brandLogo} />
    ) : (
      <div className={styles.brandLogoFallback} aria-hidden>
        <TrendingUp size={16} strokeWidth={2.5} />
      </div>
    )
  }

  function LogoMobile() {
    return data.logoUrl ? (
      <img src={data.logoUrl} alt="Logo" className={styles.headerLogo} />
    ) : (
      <div className={styles.headerLogoFallback} aria-hidden>
        <TrendingUp size={12} strokeWidth={2.5} />
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={styles.shell}>

      {/* ── Sidebar — desktop ─────────────────────────────────────────────── */}
      <aside className={styles.sidebar} aria-label="Sidebar de administración">

        {/* Brand */}
        <div className={styles.brand}>
          <LogoDesktop />
          <span className={styles.brandName}>{data.businessName}</span>
        </div>

        {/* Nav links */}
        <nav className={styles.sidebarNav} aria-label="Navegación principal">
          {NAV.map(({ href, label, Icon }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                className={`${styles.sidebarLink} ${active ? styles.sidebarLinkActive : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={16} strokeWidth={active ? 2.5 : 2} aria-hidden />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer: usuario + tasa BCV */}
        <div className={styles.sidebarFooter}>
          <div className={styles.footerUser}>
            <UserSquare2 size={12} aria-hidden />
            <span>{data.userCode}</span>
          </div>
          {data.bcvRate !== null && (
            <div className={styles.footerRate}>
              <TrendingUp size={10} aria-hidden />
              <span>Bs.&nbsp;{data.bcvRate.toFixed(2)}</span>
            </div>
          )}
        </div>
      </aside>

      {/* ── Body: header + main ───────────────────────────────────────────── */}
      <div className={styles.body}>

        {/* Header */}
        <header className={styles.header}>
          {/* Logo + nombre (visible solo mobile, sidebar lo muestra en desktop) */}
          <div className={styles.headerBrand}>
            <LogoMobile />
            <span className={styles.headerName}>{data.businessName}</span>
          </div>

          {/* Derecha: tasa BCV + usuario */}
          <div className={styles.headerRight}>
            {data.bcvRate !== null && (
              <div className={styles.ratePill} title="Tasa BCV activa">
                <TrendingUp size={10} aria-hidden />
                Bs.&nbsp;{data.bcvRate.toFixed(2)}
              </div>
            )}
            <div className={styles.userPill} title="Usuario activo">
              <UserSquare2 size={12} aria-hidden />
              {data.userCode}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className={styles.main} id="admin-main">
          {children}
        </main>
      </div>

      {/* ── Bottom nav — mobile ───────────────────────────────────────────── */}
      <nav className={styles.bottomNav} aria-label="Navegación mobile">
        {NAV.map(({ href, short, Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              ref={active ? activeBottomRef : null}
              className={`${styles.bottomNavItem} ${active ? styles.bottomNavItemActive : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={19} strokeWidth={active ? 2.5 : 1.8} aria-hidden />
              <span>{short}</span>
            </Link>
          )
        })}
      </nav>

    </div>
  )
}
