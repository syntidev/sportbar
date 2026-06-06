import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DEFAULT_HERO_PRESET } from '@/lib/hero-presets'

// Lee config de BD en cada request — sin esto Next prerenderiza el GET estático
// y serviría un snapshot congelado (borrados/efectos no se reflejan).
export const dynamic = 'force-dynamic'

// GET /api/config/hero-slots → [{slot, url, type, title, subtitle, cta, preset}] ×5
export async function GET() {
  try {
    const keys = [1,2,3,4,5].flatMap(n => [
      `hero_slot_${n}`,
      `hero_slot_${n}_type`,
      `hero_slot_${n}_title`,
      `hero_slot_${n}_subtitle`,
      `hero_slot_${n}_cta`,
      `hero_slot_${n}_preset`,
    ])
    const rows = await prisma.config.findMany({ where: { key: { in: keys } } })
    const map  = new Map(rows.map(r => [r.key, r.value]))
    const slots = [1,2,3,4,5].map(n => ({
      slot:     n,
      url:      map.get(`hero_slot_${n}`)          ?? null,
      type:     map.get(`hero_slot_${n}_type`)     ?? 'none',
      title:    map.get(`hero_slot_${n}_title`)    ?? '',
      subtitle: map.get(`hero_slot_${n}_subtitle`) ?? '',
      cta:      map.get(`hero_slot_${n}_cta`)      ?? '',
      preset:   map.get(`hero_slot_${n}_preset`)   ?? DEFAULT_HERO_PRESET,
    }))
    return NextResponse.json({ success: true, slots })
  } catch {
    return NextResponse.json({ success: false, error: 'Error' }, { status: 500 })
  }
}
