import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/config/hero-slots → returns array [{slot,url}] for all 5 slots
export async function GET() {
  try {
    const rows = await prisma.config.findMany({
      where: { key: { in: ['hero_slot_1','hero_slot_2','hero_slot_3','hero_slot_4','hero_slot_5'] } },
    })
    const map = new Map(rows.map(r => [r.key, r.value]))
    const slots = [1,2,3,4,5].map(n => ({
      slot: n,
      url:  map.get(`hero_slot_${n}`) ?? null,
    }))
    return NextResponse.json({ success: true, slots })
  } catch {
    return NextResponse.json({ success: false, error: 'Error' }, { status: 500 })
  }
}
