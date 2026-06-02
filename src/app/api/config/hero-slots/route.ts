import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/config/hero-slots → returns array [{slot, url, type}] for all 5 slots
export async function GET() {
  try {
    const keys = [1,2,3,4,5].flatMap(n => [`hero_slot_${n}`, `hero_slot_${n}_type`])
    const rows = await prisma.config.findMany({ where: { key: { in: keys } } })
    const map  = new Map(rows.map(r => [r.key, r.value]))
    const slots = [1,2,3,4,5].map(n => ({
      slot: n,
      url:  map.get(`hero_slot_${n}`)        ?? null,
      type: map.get(`hero_slot_${n}_type`)   ?? 'none',
    }))
    return NextResponse.json(
      { success: true, slots },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return NextResponse.json({ success: false, error: 'Error' }, { status: 500 })
  }
}
