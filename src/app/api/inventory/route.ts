import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { is_active: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      select: {
        id:       true,
        name:     true,
        category: true,
        inventory_item: {
          select: {
            id:        true,
            quantity:  true,
            unit:      true,
            min_stock: true,
            updated_at: true,
          },
        },
      },
    })

    // Merge: products without an inventory row get defaults
    const items = products.map((p) => ({
      product_id: p.id,
      name:       p.name,
      category:   p.category,
      inv_id:     p.inventory_item?.id ?? null,
      quantity:   Number(p.inventory_item?.quantity ?? 0),
      unit:       p.inventory_item?.unit ?? 'unid',
      min_stock:  Number(p.inventory_item?.min_stock ?? 0),
      updated_at: p.inventory_item?.updated_at ?? null,
    }))

    return NextResponse.json({ success: true, items })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al obtener inventario' }, { status: 500 })
  }
}

const PatchSchema = z.object({
  product_id: z.number().int().positive(),
  quantity:   z.number().min(0),
  unit:       z.string().min(1).max(20),
  min_stock:  z.number().min(0),
})

export async function PATCH(req: NextRequest) {
  try {
    const body  = await req.json()
    const result = PatchSchema.safeParse(body)
    if (!result.success) {
      const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
      return NextResponse.json({ success: false, errors }, { status: 400 })
    }
    const { product_id, quantity, unit, min_stock } = result.data

    const item = await prisma.inventoryItem.upsert({
      where:  { product_id },
      update: { quantity, unit, min_stock },
      create: { product_id, quantity, unit, min_stock },
    })

    return NextResponse.json({ success: true, item })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al actualizar inventario' }, { status: 500 })
  }
}
