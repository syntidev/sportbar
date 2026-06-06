/**
 * Wrapper para hero-slot que delega el procesamiento de imagen a src/lib/media.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { uploadMedia, deleteMedia, UPLOAD_HINT, MediaValidationError } from '@/lib/media'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const VALID = [1, 2, 3, 4, 5]

// ── POST — subir imagen ────────────────────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slot: string }> },
) {
  const { slot: s } = await params
  const slot = parseInt(s, 10)
  if (!VALID.includes(slot)) {
    return NextResponse.json({ success: false, error: 'Slot inválido (1-5)' }, { status: 400 })
  }

  try {
    const form = await req.formData()
    const file = form.get('image') as File | null
    if (!file) return NextResponse.json({ success: false, error: 'Sin imagen' }, { status: 400 })

    const key = `hero_slot_${slot}`

    // Leer imagen actual del slot para borrar su archivo físico tras subir la nueva
    const prev = await prisma.config.findUnique({ where: { key } })

    // Delegar procesamiento y almacenamiento a media.ts (valida MIME/tamaño, nombre único)
    const url = await uploadMedia(file, 'hero-slot', slot)

    // Borrar la imagen anterior de este slot si era un archivo local subido
    if (prev?.value && prev.value.startsWith('/uploads/')) {
      await deleteMedia(prev.value).catch(() => {})
    }

    await prisma.config.upsert({
      where:  { key },
      create: { key, value: url },
      update: { value: url },
    })

    return NextResponse.json({ success: true, url, hint: UPLOAD_HINT })
  } catch (err) {
    if (err instanceof MediaValidationError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 400 })
    }
    const msg = err instanceof Error ? err.message : 'Error al subir imagen'
    console.error('[hero-slot POST]', err)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

// ── DELETE ─────────────────────────────────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slot: string }> },
) {
  const { slot: s } = await params
  const slot = parseInt(s, 10)
  if (!VALID.includes(slot)) {
    return NextResponse.json({ success: false, error: 'Slot inválido' }, { status: 400 })
  }

  try {
    const key = `hero_slot_${slot}`

    // Borrar el archivo físico de la imagen actual del slot (si es local)
    const row = await prisma.config.findUnique({ where: { key } })
    if (row?.value && row.value.startsWith('/uploads/')) {
      await deleteMedia(row.value).catch(() => {})
    }

    // Reset completo del slot: imagen + efecto + preset + textos
    await prisma.config.deleteMany({
      where: {
        key: {
          in: [
            key,
            `hero_slot_${slot}_type`,
            `hero_slot_${slot}_preset`,
            `hero_slot_${slot}_title`,
            `hero_slot_${slot}_subtitle`,
            `hero_slot_${slot}_cta`,
          ],
        },
      },
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[hero-slot DELETE]', err)
    return NextResponse.json({ success: false, error: 'Error al eliminar slot' }, { status: 500 })
  }
}

// ── PATCH — guardar solo el tipo de efecto (hot|cold|none) ────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slot: string }> },
) {
  const { slot: s } = await params
  const slot = parseInt(s, 10)
  if (!VALID.includes(slot)) {
    return NextResponse.json({ success: false, error: 'Slot inválido' }, { status: 400 })
  }
  try {
    const body = await req.json() as { type?: string }
    const type = ['hot', 'cold', 'none'].includes(body.type ?? '') ? body.type! : 'none'
    const key  = `hero_slot_${slot}_type`
    await prisma.config.upsert({
      where:  { key },
      create: { key, value: type },
      update: { value: type },
    })
    return NextResponse.json({ success: true, type })
  } catch (err) {
    console.error('[hero-slot PATCH]', err)
    return NextResponse.json({ success: false, error: 'Error' }, { status: 500 })
  }
}
