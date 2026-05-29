import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

// ── Shared select shape ───────────────────────────────────────────────────────

const PRODUCT_SELECT = {
  id:          true,
  name:        true,
  description: true,
  price_usd:   true,
  category:    true,
  image_url:   true,
  is_active:   true,
} as const

// ── Schemas ───────────────────────────────────────────────────────────────────

const CreateSchema = z.object({
  name:        z.string({ error: 'Nombre requerido' }).trim().min(1, 'Nombre requerido').max(100),
  description: z.string().trim().max(500).optional(),
  price_usd:   z.coerce.number({ error: 'Precio invalido' }).positive('El precio debe ser mayor a 0'),
  category:    z.enum(['hamburguesas', 'raciones', 'bebidas'], { error: 'Categoria invalida' }),
  is_active:   z.boolean().optional().default(true),
})

// ── GET /api/products ─────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const all      = req.nextUrl.searchParams.get('all') === 'true'
    const products = await prisma.product.findMany({
      where:   all ? undefined : { is_active: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      select:  PRODUCT_SELECT,
    })
    return NextResponse.json({ success: true, products })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Error al obtener productos' },
      { status: 500 },
    )
  }
}

// ── POST /api/products ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Body invalido' }, { status: 400 })
  }

  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 422 },
    )
  }

  const { name, description, price_usd, category, is_active } = parsed.data

  try {
    const product = await prisma.product.create({
      data:   { name, description: description ?? null, price_usd, category, is_active },
      select: PRODUCT_SELECT,
    })
    return NextResponse.json({ success: true, product }, { status: 201 })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Error al crear producto' },
      { status: 500 },
    )
  }
}
