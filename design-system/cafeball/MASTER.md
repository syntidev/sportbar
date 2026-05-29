# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** CafeBall
**Generated:** 2026-05-27 15:28:36
**Category:** POS + KDS Sport Bar — Dark Operational Theme

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Background | `#0a0a0a` | `--color-bg` |
| Surface | `#111411` | `--color-surface` |
| Surface 2 | `#1a1f1a` | `--color-surface-2` |
| Primary (Verde Guaiqueries) | `#2E7D32` | `--color-primary` |
| Primary Light | `#4CAF50` | `--color-primary-light` |
| Accent (Rojo Llama) | `#C62828` | `--color-accent` |
| Brand (Naranja Café ConBike) | `#F5A623` | `--color-brand` |
| Brand Warm (Café Rueda) | `#8B6914` | `--color-brand-warm` |
| Text | `#f0f5f0` | `--color-text` |
| Text Muted | `rgba(240,245,240,0.5)` | `--color-text-muted` |
| Border | `rgba(46,125,50,0.25)` | `--color-border` |

**Color Notes:** Negro estadio + verde cancha + naranja café. Dark theme por defecto.

### Light Mode Palette (`.light`)

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Background | `#FAF3E8` | `--color-bg` |
| Surface | `#FFF8EE` | `--color-surface` |
| Surface 2 | `#F2E8D5` | `--color-surface-2` |
| Surface 3 | `#E8D9BE` | `--color-surface-3` |
| Border | `rgba(46, 90, 40, 0.15)` | `--color-border` |
| Border Strong | `rgba(46, 90, 40, 0.3)` | `--color-border-strong` |
| Text | `#1A1208` | `--color-text` |
| Text Muted | `#5C4A2A` | `--color-text-muted` |
| Text Subtle | `#8C7355` | `--color-text-subtle` |
| Primary (Verde −15% sat.) | `#3D6B35` | `--color-primary` |
| Primary Light | `#5A8F50` | `--color-primary-light` |
| Accent (Rojo oscurecido) | `#B5451B` | `--color-accent` |
| Brand (Naranja −10%) | `#E8920A` | `--color-brand` |
| Brand Warm | `#7A5C10` | `--color-brand-warm` |
| Shadow | `rgba(90, 60, 10, 0.1)` | `--color-shadow` |

**Light Mode Notes:** Verde Guaiqueries −15% saturación para fondo claro sin quemar. Naranja ConBike −10% para contraste ≥4.5:1. Textura pergamino cálida (#FAF3E8) sin amarillo excesivo.

### Estado Operativo

| Estado | Hex | CSS Variable |
|--------|-----|--------------|
| NUEVO | `#F5A623` | `--color-nuevo` |
| PREP | `#2E7D32` | `--color-prep` |
| LISTO | `#4CAF50` | `--color-listo` |
| PAGADO | `#4CAF50` | `--color-pagado` |
| CRÉDITO | `#7C4DFF` | `--color-credito` |
| PENDIENTE | `#F5A623` | `--color-pendiente` |
| CANCELADO | `#C62828` | `--color-cancelado` |

### Typography

- **Heading Font:** Inter
- **Body Font:** Inter
- **Mood:** Technical + Clear typography

### Spacing Variables

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Hero padding |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards, buttons |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Hero images, featured cards |

---

## Component Specs

### Buttons

```css
/* Primary Button */
.btn-primary {
  background: var(--color-primary);
  color: var(--color-text);
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-primary:hover {
  background: var(--color-primary-light);
  transform: translateY(-1px);
}

/* Brand/CTA Button */
.btn-brand {
  background: var(--color-brand);
  color: #0a0a0a;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 700;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-brand:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Secondary Button */
.btn-secondary {
  background: transparent;
  color: var(--color-text);
  border: 2px solid var(--color-border);
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-secondary:hover {
  border-color: var(--color-primary);
}
```

### Cards

```css
.card {
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow-md);
  transition: all 200ms ease;
  cursor: pointer;
}

.card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 1px var(--color-primary), var(--shadow-lg);
  transform: translateY(-2px);
}
```

### Inputs

```css
.input {
  padding: 12px 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 16px;
  color: var(--color-text);
  transition: border-color 200ms ease;
}

.input:focus {
  border-color: var(--color-primary);
  outline: none;
  box-shadow: 0 0 0 3px rgba(46,125,50,0.2);
}
```

### Modals

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
}

.modal {
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 90%;
}
```

---

## Style Guidelines

**Style:** Dark Operational / Stadium UI

**Keywords:** Negro estadio, verde cancha, naranja café, dark mode, operativo, POS, KDS, sport bar, Venezuela

**Best For:** POS táctil, KDS cocina/bar, dashboards operativos, pantallas de alta actividad

**Key Effects:** Verde glow en estados activos, naranja para alertas/nuevo, bordes semitransparentes verde, superficies negras profundas

### Page Pattern

**Pattern Name:** Horizontal Scroll Journey

- **Conversion Strategy:** Immersive product discovery. High engagement. Keep navigation visible.
28,Bento Grid Showcase,bento,  grid,  features,  modular,  apple-style,  showcase", 1. Hero, 2. Bento Grid (Key Features), 3. Detail Cards, 4. Tech Specs, 5. CTA, Floating Action Button or Bottom of Grid, Card backgrounds: #F5F5F7 or Glass. Icons: Vibrant brand colors. Text: Dark., Hover card scale (1.02), video inside cards, tilt effect, staggered reveal, Scannable value props. High information density without clutter. Mobile stack.
29,Interactive 3D Configurator,3d,  configurator,  customizer,  interactive,  product", 1. Hero (Configurator), 2. Feature Highlight (synced), 3. Price/Specs, 4. Purchase, Inside Configurator UI + Sticky Bottom Bar, Neutral studio background. Product: Realistic materials. UI: Minimal overlay., Real-time rendering, material swap animation, camera rotate/zoom, light reflection, Increases ownership feeling. 360 view reduces return rates. Direct add-to-cart.
30,AI-Driven Dynamic Landing,ai,  dynamic,  personalized,  adaptive,  generative", 1. Prompt/Input Hero, 2. Generated Result Preview, 3. How it Works, 4. Value Prop, Input Field (Hero) + 'Try it' Buttons, Adaptive to user input. Dark mode for compute feel. Neon accents., Typing text effects, shimmering generation loaders, morphing layouts, Immediate value demonstration. 'Show, don't tell'. Low friction start.
- **CTA Placement:** Floating Sticky CTA or End of Horizontal Track
- **Section Order:** 1. Intro (Vertical), 2. The Journey (Horizontal Track), 3. Detail Reveal, 4. Vertical Footer

---

## Anti-Patterns (Do NOT Use)

- ⚠️ Light mode: opt-in vía clase `.light` — dark es el default irrompible para POS/KDS
- ❌ Colores hardcodeados — siempre usar CSS variables
- ❌ Signo `$` para moneda — usar `REF` (USD) y `Bs.` (bolívares)
- ❌ Emojis como iconos de UI — solo Lucide React
- ❌ Tailwind — CSS Modules únicamente

### Additional Forbidden Patterns

- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile
