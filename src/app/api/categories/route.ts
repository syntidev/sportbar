import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Category 酿 String libre — se infiere de los productos existentes.
// Retorna lista única de categorías con conteos.

// ── GET /api/categories ─────────────────────────────────────────────

export async function GET() {
  try {
    const [totalRows, activeRows] = await Promise.all([
      prisma.product.groupBy({
        by:      ['category'],
        _count:  { id: true },
        orderBy: { category: 'asc' },
      }),
      prisma.product.groupBy({
        by:      ['category'],
        where:   { is_active: true },
        _count:  { id: true },
      }),
    ])

    const activeMap = new Map(activeRows.map((r) => [r.category, r._count.id]))

    const categories = totalRows.map((r) => ({
      key:    r.category,
      total:  r._count.id,
      active: activeMap.get(r.category) ?? 0,
    }))

    return NextResponse.json({ success: true, categories })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Error al obtener categorías' },
      { status: 500 },
    )
  }
}
