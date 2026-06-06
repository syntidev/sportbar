/**
 * Wrapper para logo que delega el procesamiento de imagen a src/lib/media.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { uploadMedia, deleteMedia, UPLOAD_HINT, MediaValidationError } from '@/lib/media'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

// ── POST — subir logo ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Archivo requerido' }, { status: 400 })
    }

    // Leer logo actual para borrar su archivo físico tras subir el nuevo
    const prev = await prisma.config.findUnique({ where: { key: 'business_logo_url' } })

    // Delegar procesamiento y almacenamiento a media.ts
    // media.ts valida MIME (jpg/png/webp) y tamaño (5 MB), nombre único
    const url = await uploadMedia(file, 'logo')

    // Borrar el logo anterior si era un archivo local subido (no URL externa)
    if (prev?.value && prev.value.startsWith('/uploads/')) {
      await deleteMedia(prev.value).catch(() => {})
    }

    await prisma.config.upsert({
      where:  { key: 'business_logo_url' },
      create: { key: 'business_logo_url', value: url },
      update: { value: url },
    })

    return NextResponse.json({ success: true, url, hint: UPLOAD_HINT })
  } catch (err) {
    if (err instanceof MediaValidationError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 400 })
    }
    const msg = err instanceof Error ? err.message : 'Error al guardar el logo'
    console.error('[logo POST]', err)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
