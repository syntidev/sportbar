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
  badge:       true,
  is_featured: true,
  image_url:   true,
  effect_type: true,
  is_active:   true,
} as const

// ── Schemas ───────────────────────────────────────────────────────────────────

const VALID_BADGES = ['popular', 'nuevo', 'promo', 'recomendado'] as const

// PATCH — toggle is_active or is_featured
const PatchSchema = z.object({
  is_active:   z.boolean().optional(),
  is_featured: z.boolean().optional(),
}).refine((d) => d.is_active !== undefined || d.is_featured !== undefined, {
  message: 'Se requiere is_active o is_featured',
})

// PUT — full update
const UpdateSchema = z.object({
  name:        z.string().trim().min(1, 'Nombre requerido').max(100),
  description: z.string().trim().max(500).nullable().optional(),
  price_usd:   z.coerce.number().positive('El precio debe ser mayor a 0'),
  category:    z.string().trim().min(1, 'Categoría requerida').max(60),
  badge:       z.enum(VALID_BADGES).nullable().optional(),
  is_featured: z.boolean().optional(),
  is_active:   z.boolean().optional(),
  effect_type: z.enum(['steam', 'frost']).nullable().optional(),
})

// ── Helper ────────────────────────────────────────────────────────────────────

function parseId(params: { id: string }): number | null {
  const n = parseInt(params.id, 10)
  return isNaN(n) ? null : n
}

// ── GET /api/products/[id] ────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = parseId(await params)
  if (!id) return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 })

  try {
    const product = await prisma.product.findUnique({ where: { id }, select: PRODUCT_SELECT })
    if (!product) return NextResponse.json({ success: false, error: 'Producto no encontrado' }, { status: 404 })
    return NextResponse.json({ success: true, product })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al obtener producto' }, { status: 500 })
  }
}

// ── PATCH /api/products/[id] — toggle active / featured ──────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = parseId(await params)
  if (!id) return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ success: false, error: 'Body inválido' }, { status: 400 })
  }

  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
      { status: 422 },
    )
  }

  try {
    const product = await prisma.product.update({
      where:  { id },
      data:   parsed.data,
      select: PRODUCT_SELECT,
    })
    return NextResponse.json({ success: true, product })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al actualizar producto' }, { status: 500 })
  }
}

// ── PUT /api/products/[id] — full update ──────────────────────────────────────

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = parseId(await params)
  if (!id) return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ success: false, error: 'Body inválido' }, { status: 400 })
  }

  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
      { status: 422 },
    )
  }

  const { name, description, price_usd, category, badge, is_featured, is_active, effect_type } = parsed.data

  try {
    const product = await prisma.product.update({
      where:  { id },
      data: {
        name,
        description: description ?? null,
        price_usd,
        category,
        badge:       badge ?? null,
        is_featured: is_featured ?? false,
        is_active:   is_active ?? true,
        effect_type: effect_type ?? null,
      },
      select: PRODUCT_SELECT,
    })
    return NextResponse.json({ success: true, product })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al actualizar producto' }, { status: 500 })
  }
}

// ── DELETE /api/products/[id] ─────────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = parseId(await params)
  if (!id) return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 })

  try {
    await prisma.product.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al eliminar producto' }, { status: 500 })
  }
}
