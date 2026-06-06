/**
 * POST   /api/media  { type, id?, file }  → sube y procesa la imagen con media.ts
 * DELETE /api/media  { url }              → elimina archivo físico + config DB
 *
 * Este endpoint es el punto unificado de entrada. Los endpoints legacy
 * (hero-slot, logo, products/upload) siguen funcionando como wrappers
 * que añaden lógica de negocio específica (auth, DB updates propios).
 */

import { NextRequest, NextResponse } from 'next/server'
import { uploadMedia, deleteMedia, UPLOAD_HINT, MediaValidationError, type MediaType } from '@/lib/media'

export const runtime = 'nodejs'

const VALID_TYPES = new Set<MediaType>(['product', 'logo', 'hero-slot', 'splash'])

// ── POST — subir archivo ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const type = form.get('type') as string
    const id   = form.get('id')   as string | null
    const file = form.get('file')

    if (!VALID_TYPES.has(type as MediaType)) {
      return NextResponse.json(
        { success: false, error: `Tipo inválido. Opciones: ${Array.from(VALID_TYPES).join(', ')}` },
        { status: 400 },
      )
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Archivo requerido en campo "file"' }, { status: 400 })
    }

    const url = await uploadMedia(file, type as MediaType, id ?? undefined)
    return NextResponse.json({ success: true, url, hint: UPLOAD_HINT })
  } catch (err) {
    if (err instanceof MediaValidationError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 400 })
    }
    const msg = err instanceof Error ? err.message : 'Error al subir archivo'
    console.error('[media POST]', err)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

// ── DELETE — eliminar archivo ──────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json() as { url?: string }

    if (!body.url || typeof body.url !== 'string') {
      return NextResponse.json({ success: false, error: '"url" requerida en el cuerpo JSON' }, { status: 400 })
    }

    await deleteMedia(body.url)
    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al eliminar archivo'
    console.error('[media DELETE]', err)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
