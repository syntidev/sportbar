/**
 * GET    /api/config/splash           → { success, config: SplashConfigResponse }
 * POST   /api/config/splash           { image: File, slot?: '1'|'2' }
 * PATCH  /api/config/splash           { productName?, subtitle?, durationSeconds?, forceReload? }
 * DELETE /api/config/splash?slot=1|2  → elimina imagen del slot indicado
 */

import { NextRequest, NextResponse } from 'next/server'
import { uploadMedia, deleteMedia, UPLOAD_HINT, MediaValidationError } from '@/lib/media'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

// ── Config keys ────────────────────────────────────────────────────────────────
const KEYS = {
  productImage:    'splash_product_image',
  productImage2:   'splash_product_image_2',
  productName:     'splash_product_name',
  subtitle:        'splash_subtitle',
  durationSeconds: 'splash_duration_seconds',
  forceReload:     'splash_force_reload',
} as const

type SplashKey = typeof KEYS[keyof typeof KEYS]

export interface SplashConfigResponse {
  productImage:    string | null
  productImage2:   string | null
  productName:     string
  subtitle:        string
  durationSeconds: number
  forceReload:     boolean
}

function buildConfig(rows: { key: string; value: string }[]): SplashConfigResponse {
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]))
  return {
    productImage:    map[KEYS.productImage]    ?? null,
    productImage2:   map[KEYS.productImage2]   ?? null,
    productName:     map[KEYS.productName]     ?? '',
    subtitle:        map[KEYS.subtitle]        ?? '',
    durationSeconds: (parseInt(map[KEYS.durationSeconds] ?? '4', 10) || 4),
    forceReload:     (map[KEYS.forceReload] ?? 'true') !== 'false',
  }
}

// ── GET ────────────────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const rows = await prisma.config.findMany({
      where: { key: { in: Object.values(KEYS) as SplashKey[] } },
    })
    return NextResponse.json({ success: true, config: buildConfig(rows) })
  } catch (err) {
    console.error('[splash GET]', err)
    return NextResponse.json({ success: false, error: 'Error al leer configuración' }, { status: 500 })
  }
}

// ── POST — subir imagen (slot 1 ó 2) ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const form   = await req.formData()
    const file   = form.get('image')
    const isSlot2 = form.get('slot') === '2'
    const imageKey = isSlot2 ? KEYS.productImage2 : KEYS.productImage

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Campo "image" requerido' }, { status: 400 })
    }

    // Eliminar imagen anterior del mismo slot si existe
    const prev = await prisma.config.findUnique({ where: { key: imageKey } })
    if (prev?.value) {
      await deleteMedia(prev.value).catch(() => {})
    }

    const url = await uploadMedia(file, 'splash')

    await prisma.config.upsert({
      where:  { key: imageKey },
      create: { key: imageKey, value: url },
      update: { value: url },
    })

    return NextResponse.json({ success: true, url, slot: isSlot2 ? 2 : 1, hint: UPLOAD_HINT })
  } catch (err) {
    if (err instanceof MediaValidationError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 400 })
    }
    const msg = err instanceof Error ? err.message : 'Error al subir imagen'
    console.error('[splash POST]', err)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

// ── PATCH — actualizar config de texto / número / booleano ───────────────────
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json() as Partial<{
      productName:     string
      subtitle:        string
      durationSeconds: number
      forceReload:     boolean
    }>

    const updates: { key: SplashKey; value: string }[] = []

    if (body.productName     !== undefined)
      updates.push({ key: KEYS.productName,     value: String(body.productName) })
    if (body.subtitle        !== undefined)
      updates.push({ key: KEYS.subtitle,        value: String(body.subtitle) })
    if (body.durationSeconds !== undefined)
      updates.push({ key: KEYS.durationSeconds, value: String(Math.min(8, Math.max(2, body.durationSeconds))) })
    if (body.forceReload     !== undefined)
      updates.push({ key: KEYS.forceReload,     value: body.forceReload ? 'true' : 'false' })

    if (updates.length === 0) {
      return NextResponse.json({ success: true, message: 'Sin cambios' })
    }

    await prisma.$transaction(
      updates.map(({ key, value }) =>
        prisma.config.upsert({
          where:  { key },
          create: { key, value },
          update: { value },
        }),
      ),
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[splash PATCH]', err)
    return NextResponse.json({ success: false, error: 'Error al guardar configuración' }, { status: 500 })
  }
}

// ── DELETE — eliminar imagen del slot indicado (?slot=1 ó ?slot=2) ────────────
export async function DELETE(req: NextRequest) {
  try {
    const isSlot2  = req.nextUrl.searchParams.get('slot') === '2'
    const imageKey = isSlot2 ? KEYS.productImage2 : KEYS.productImage

    const row = await prisma.config.findUnique({ where: { key: imageKey } })
    if (row?.value) {
      await deleteMedia(row.value)
    }
    return NextResponse.json({ success: true, slot: isSlot2 ? 2 : 1 })
  } catch (err) {
    console.error('[splash DELETE]', err)
    return NextResponse.json({ success: false, error: 'Error al eliminar imagen' }, { status: 500 })
  }
}
