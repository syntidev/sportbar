/**
 * src/lib/hero-presets.ts — Presets visuales del hero slider
 *
 * 4 temas fijos compartidos entre /admin/marketing (selector) y / (render público).
 * Los colores/fuentes son DATOS del preset (spec), no tokens de UI — se aplican
 * como inline-style sobre contenido dinámico del slider.
 */

export type HeroPresetId = 'fire' | 'ice' | 'night' | 'sport'

export type HeroTextPosition = 'left' | 'right' | 'center'

export interface HeroPreset {
  id:            HeroPresetId
  name:          string
  fontFamily:    string
  titleColor:    string
  subtitleColor: string
  position:      HeroTextPosition
  overlay:       string
}

export const HERO_PRESETS: Record<HeroPresetId, HeroPreset> = {
  fire: {
    id: 'fire', name: 'Fuego',
    fontFamily: "'Bebas Neue', sans-serif",
    titleColor: '#F5A623', subtitleColor: '#FFFFFF',
    position: 'left', overlay: 'rgba(0,0,0,0.45)',
  },
  ice: {
    id: 'ice', name: 'Hielo',
    fontFamily: "'DM Sans', sans-serif",
    titleColor: '#FFFFFF', subtitleColor: '#90CAF9',
    position: 'right', overlay: 'rgba(0,20,60,0.55)',
  },
  night: {
    id: 'night', name: 'Noche',
    fontFamily: 'Georgia, serif',
    titleColor: '#FFD700', subtitleColor: '#F5F5F5',
    position: 'center', overlay: 'rgba(0,0,0,0.60)',
  },
  sport: {
    id: 'sport', name: 'Sport',
    fontFamily: "'Impact', sans-serif",
    titleColor: '#FFEB3B', subtitleColor: '#FFFFFF',
    position: 'left', overlay: 'rgba(0,0,0,0.40)',
  },
}

export const DEFAULT_HERO_PRESET: HeroPresetId = 'fire'

export const HERO_PRESET_LIST: HeroPreset[] = [
  HERO_PRESETS.fire,
  HERO_PRESETS.ice,
  HERO_PRESETS.night,
  HERO_PRESETS.sport,
]

/** Normaliza cualquier string a un preset válido (fallback: fire). */
export function resolveHeroPreset(id: string | null | undefined): HeroPreset {
  if (id === 'fire' || id === 'ice' || id === 'night' || id === 'sport') {
    return HERO_PRESETS[id]
  }
  return HERO_PRESETS[DEFAULT_HERO_PRESET]
}
