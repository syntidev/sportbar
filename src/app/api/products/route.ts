import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

// ── Shared select shape ─────────────────────────────────────────────────────

const PRODUCT_SELECT = {
  id:          true,
  name:        true,
  description: true,
  price_usd:   true,
  category:    true,
  badge:       true,
  is_featured: true,
  image_url:   true,
  is_active:   true,
} as const

// ── Schemas ───────────────────────────────────────────────────────────────

const VALID_BADGES = ['popular', 'nuevo', 'promo', 'recomendado'] as const

const CreateSchema = z.object({
  name:        z.string({ error: 'Nombre requerido' }).trim().min(1, 'Nombre requerido').max(100),
  description: z.string().trim().max(500).optional(),
  price_usd:   z.coerce.number({ error: 'Precio inválido' }).positive('El precio debe ser mayor a 0'),
  category:    z.string().trim().min(1, 'Categoría requerida').max(60),
  badge:       z.enum(VALID_BADGES).nullable().optional(),
  is_featured: z.boolean().optional().default(false),
  is_active:   z.boolean().optional().default(true),
})

// ── GET /api/products ───────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const all      = searchParams.get('all') === 'true'
    const category = searchParams.get('category')
    const page     = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1)
    const perPage  = Math.min(parseInt(searchParams.get('per_page') ?? '200', 10) || 200, 200)

    const where = {
      ...(all ? {} : { is_active: true }),
      ...(category ? { category } : {}),
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
        select:  PRODUCT_SELECT,
        take:    perPage,
        skip:    (page - 1) * perPage,
      }),
      prisma.product.count({ where }),
    ])

    return NextResponse.json({ success: true, products, total, page, per_page: perPage })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Error al obtener productos' },
      { status: 500 },
    )
  }
}

// ── POST /api/products ───────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Body inválido' }, { status: 400 })
  }

  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
      { status: 422 },
    )
  }

  const { name, description, price_usd, category, badge, is_featured, is_active } = parsed.data

  try {
    const product = await prisma.product.create({
      data: {
        name,
        description: description ?? null,
        price_usd,
        category,
        badge:       badge ?? null,
        is_featured: is_featured ?? false,
        is_active,
      },
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
