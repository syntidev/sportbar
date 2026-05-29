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

const PatchSchema = z.object({
  is_active: z.boolean(),
})

const UpdateSchema = z.object({
  name:        z.string({ error: 'Nombre requerido' }).trim().min(1, 'Nombre requerido').max(100),
  description: z.string().trim().max(500).nullable().optional(),
  price_usd:   z.coerce.number({ error: 'Precio inválido' }).positive('El precio debe ser mayor a 0'),
  category:    z.enum(['hamburguesas', 'raciones', 'bebidas'], { error: 'Categoría inválida' }),
  is_active:   z.boolean(),
})

// ── He