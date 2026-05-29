import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Category } from '@/types'

// Category es un enum de Prisma — los valores son fijos.
// Este endpoint agrega conteos por categoría desde la tabla Product.

const CATEGORY_ORDER: Category[] = ['hamburguesas', 'raciones', 'bebidas']

// ── GET /api/categories ───────────────────────────────────────────────────────

export async function GET() {
  try {
    const [totalRows, activeRows] = await Promise.all([
      prisma.product.groupBy({
        by:      ['category'],
        _count:  { id: true },
      }),
      prisma.product.groupBy({
        by:      ['category'],
        where:   { is_active: true },
        _count:  { id: true },
      }),
    ])

    const totalMap  = new Map(totalRows.map((r)  => [r.category as Category, r._count.id]))
    const activeMap = new Map(activeRows.map((r) => [r.category as Category, r._count.id]))

    const categories = CATEGORY_ORDER.map((key) => ({
      key,
      total:  totalMap.get(key)  ?? 0,
      active: activeMap.get(key) ?? 0,
    }))

    return NextResponse.json({ success: true, categories })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Error al obtener categorías' },
      { status: 500 },
    )
  }
}
