import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, unlink, readdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import sharp from 'sharp'
import { prisma } from '@/lib/prisma'

const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Archivo requerido' }, { status: 400 })
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Formato no permitido. Usa PNG, JPG o WebP.' },
        { status: 400 },
      )
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { success: false, error: 'El archivo supera el límite de 5 MB.' },
        { status: 400 },
      )
    }

    // Nombre único con timestamp — garantiza que el browser SIEMPRE cargue la versión nueva
    const ts       = Date.now()
    const filename = `logo_${ts}.webp`
    const uploadsDir = join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadsDir, { recursive: true })

    // Convertir a WebP 800×800 máx con Sharp
    const buf = await sharp(Buffer.from(await file.arrayBuffer()))
      .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer()

    await writeFile(join(uploadsDir, filename), buf)

    // Borrar logos anteriores (logo_*.webp) para no acumular archivos
    try {
      const files = await readdir(uploadsDir)
      await Promise.all(
        files
          .filter(f => /^logo_\d+\.webp$/.test(f) && f !== filename)
          .map(f => unlink(join(uploadsDir, f)).catch(() => {})),
      )
    } catch { /* no crítico */ }

    // Borrar logo.png / logo.jpg legacy si existían
    for (const legacy of ['logo.png', 'logo.jpg', 'logo.webp']) {
      const p = join(uploadsDir, legacy)
      if (existsSync(p)) await unlink(p).catch(() => {})
    }

    const url = `/uploads/${filename}`
    await prisma.config.upsert({
      where:  { key: 'business_logo_url' },
      create: { key: 'business_logo_url', value: url },
      update: { value: url },
    })

    return NextResponse.json({ success: true, url })
  } catch (err) {
    console.error('logo upload:', err)
    return NextResponse.json(
      { success: false, error: 'Error al guardar el logo' },
      { status: 500 },
    )
  }
}
