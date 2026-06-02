/**
 * Wrapper para logo que delega el procesamiento de imagen a src/lib/media.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { readdir, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { uploadMedia } from '@/lib/media'
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

    // Delegar procesamiento y almacenamiento a media.ts
    // media.ts valida MIME (jpg/png/webp/avif) y tamaño (5 MB)
    const url = await uploadMedia(file, 'logo')

    // Limpiar logos anteriores (logo_*.webp) para no acumular archivos
    const uploadsDir = join(process.cwd(), 'public', 'uploads')
    const newFilename = url.split('/').pop()! // logo_ts.webp
    try {
      const files = await readdir(uploadsDir)
      await Promise.all(
        files
          .filter(f => /^logo_\d+\.webp$/.test(f) && f !== newFilename)
          .map(f => unlink(join(uploadsDir, f)).catch(() => {})),
      )
    } catch { /* no crítico */ }

    // Borrar archivos legacy si existían
    for (const legacy of ['logo.png', 'logo.jpg', 'logo.webp']) {
      const p = join(uploadsDir, legacy)
      if (existsSync(p)) await unlink(p).catch(() => {})
    }

    await prisma.config.upsert({
      where:  { key: 'business_logo_url' },
      create: { key: 'business_logo_url', value: url },
      update: { value: url },
    })

    return NextResponse.json({ success: true, url })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al guardar el logo'
    console.error('[logo POST]', err)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
