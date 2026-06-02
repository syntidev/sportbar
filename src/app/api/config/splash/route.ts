/**
 * GET    /api/config/splash  → { success, url: string | null }
 * POST   /api/config/splash  { image: File }  → sube splash y guarda en config
 * DELETE /api/config/splash  → elimina splash actual
 */

import { NextRequest, NextResponse } from 'next/server'
import { uploadMedia, deleteMedia } from '@/lib/media'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const CONFIG_KEY = 'splash_image_url'

// ── GET ────────────────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const row = await prisma.config.findUnique({ where: { key: CONFIG_KEY } })
    return NextResponse.json({ success: true, url: row?.value ?? null })
  } catch (err) {
    console.error('[splash GET]', err)
    return NextResponse.json({ success: false, error: 'Error al leer configuración' }, { status: 500 })
  }
}

// ── POST ───────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('image')

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Campo "image" requerido' }, { status: 400 })
    }

    // Eliminar splash anterior si existe
    const prev = await prisma.config.findUnique({ where: { key: CONFIG_KEY } })
    if (prev?.value) {
      await deleteMedia(prev.value).catch(() => {})
    }

    const url = await uploadMedia(file, 'splash')

    await prisma.config.upsert({
      where:  { key: CONFIG_KEY },
      create: { key: CONFIG_KEY, value: url },
      update: { value: url },
    })

    return NextResponse.json({ success: true, url })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al subir splash'
    console.error('[splash POST]', err)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

// ── DELETE ─────────────────────────────────────────────────────────────────────
export async function DELETE() {
  try {
    const row = await prisma.config.findUnique({ where: { key: CONFIG_KEY } })
    if (row?.value) {
      await deleteMedia(row.value)
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[splash DELETE]', err)
    return NextResponse.json({ success: false, error: 'Error al eliminar splash' }, { status: 500 })
  }
}
