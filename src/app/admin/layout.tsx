'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard, Clock, Banknote, UtensilsCrossed,
  Users, Building2, Settings, CalendarDays, UserSquare2,
  TrendingUp, Megaphone, BarChart2, Package, ChefHat, GlassWater, Activity,
  CalendarRange,
} from 'lucide-react'
import styles from './layout.module.css'

// ── Nav structure with groups ──────────────────────────────────────────────────

interface NavItem {
  href:  string
  label: string
  short: string
  Icon:  LucideIcon
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'OPERACIÓN',
    items: [
      { href: '/admin',        label: 'Mission Control', short: 'Control', Icon: LayoutDashboard },
      { href: '/admin/turno',  label: 'Turno',           short: 'Turno',   Icon: Clock           },
      { href: '/kds/cocina',   label: 'KDS Cocina',      short: 'Cocina',  Icon: ChefHat         },
      { href: '/kds/bar',      label: 'KDS Bar',         short: 'Bar',     Icon: GlassWater      },
    ],
  },
  {
    label: 'VENTAS',
    items: [
      { href: '/admin/caja',    label: 'Caja',     short: 'Caja',    Icon: Banknote     },
      { href: '/admin/partido', label: 'Partidos', short: 'Partido', Icon: CalendarDays },
      { href: '/admin/eventos', label: 'Eventos',  short: 'Eventos', Icon: CalendarRange },
    ],
  },
  {
    label: 'CATÁLOGO',
    items: [
      { href: '/admin/menu',       label: 'Menú',       short: 'Menú',   Icon: UtensilsCrossed },
      { href: '/admin/inventario', label: 'Inventario', short: 'Invent', Icon: Package         },
    ],
  },
  {
    label: 'RECURSOS',
    items: [
      { href: '/admin/estructura', label: 'Estructura', short: 'Estruc.', Icon: Building2 },
      { href: '/admin/equipo',     label: 'Equipo',     short: 'Equipo',  Icon: Users     },
    ],
  },
  {
    label: 'MARKETING',
    items: [
      { href: '/admin/marketing', label: 'Marketing', short: 'Market', Icon: Megaphone },
    ],
  },
  {
    label: 'CONFIGURACIÓN',
    items: [
      { href: '/admin/config', label: 'Config', short: 'Config', Icon: Settings    },
      { href: '/admin/perfil', label: 'Perfil', short: 'Perfil', Icon: UserSquare2 },
    ],
  },
  {
    label: 'KPIs',
    items: [
      { href: '/admin/analytics',  label: 'Pulso del Negocio', short: 'Pulso',  Icon: BarChart2 },
      { href: '/admin/simulator',  label: 'Simulador',         short: 'Simul.', Icon: Activity  },
    ],
  },
]

// Flat list for the mobile bottom nav (first 7 most-used items)
const BOTTOM_NAV: NavItem[] = [
  { href: '/admin',            label: 'Control',  short: 'Control', Icon: LayoutDashboard },
  { href: '/admin/turno',      label: 'Turno',    short: 'Turno',   Icon: Clock           },
  { href: '/admin/caja',       label: 'Caja',     short: 'Caja',    Icon: Banknote        },
  { href: '/admin/menu',       label: 'Menú',     short: 'Menú',    Icon: UtensilsCrossed },
  { href: '/admin/partido',    label: 'Partidos', short: 'Partido', Icon: CalendarDays    },
  { href: '/admin/marketing',  label: 'Market',   short: 'Market',  Icon: Megaphone       },
  { href: '/admin/analytics',  label: 'Pulso',    short: 'Pulso',   Icon: BarChart2       },
]

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

  const activeBottomRef = useRef<HTMLAnchorElement | null>(null)

  useEffect(() => {
    activeBottomRef.current?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [pathname])

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

  // Escucha el evento que lanza Perfil cuando sube un logo nuevo —
  // así el navbar se actualiza en la misma sesión sin recargar la página
  useEffect(() => {
    function onLogoUpdated(e: Event) {
      const url = (e as CustomEvent<{ url: string }>).detail?.url
      if (url) setData(prev => ({ ...prev, logoUrl: url }))
    }
    window.addEventListener('logo-updated', onLogoUpdated)
    return () => window.removeEventListener('logo-updated', onLogoUpdated)
  }, [])

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

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

  return (
    <div className={styles.shell}>

      {/* ── Sidebar — desktop ─────────────────────────────────────────────── */}
      <aside className={styles.sidebar} aria-label="Sidebar de administración">

        {/* Brand */}
        <div className={styles.brand}>
          <LogoDesktop />
          <span className={styles.brandName}>{data.businessName}</span>
        </div>

        {/* Grouped nav */}
        <nav className={styles.sidebarNav} aria-label="Navegación principal">
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.label} className={styles.navGroup}>
              {gi > 0 && <div className={styles.navDivider} aria-hidden />}
              <span className={styles.navGroupLabel}>{group.label}</span>
              {group.items.map(({ href, label, Icon }) => {
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
            </div>
          ))}
        </nav>

        {/* Footer */}
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

        <header className={styles.header}>
          <div className={styles.headerBrand}>
            <LogoMobile />
            <span className={styles.headerName}>{data.businessName}</span>
          </div>
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

        <main className={styles.main} id="admin-main">
          {children}
        </main>
      </div>

      {/* ── Bottom nav — mobile ───────────────────────────────────────────── */}
      <nav className={styles.bottomNav} aria-label="Navegación mobile">
        {BOTTOM_NAV.map(({ href, short, Icon }) => {
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
