import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/prisma'

const ALLOWED: Record<string, string> = {
  'image/png':  'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

const MAX_BYTES = 2 * 1024 * 1024 // 2 MB

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Archivo requerido' }, { status: 400 })
    }

    const ext = ALLOWED[file.type]
    if (!ext) {
      return NextResponse.json(
        { success: false, error: 'Formato no permitido. Usa PNG, JPG o WebP.' },
        { status: 400 },
      )
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { success: false, error: 'El archivo supera el límite de 2 MB.' },
        { status: 400 },
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const uploadsDir = join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadsDir, { recursive: true })
    await writeFile(join(uploadsDir, `logo.${ext}`), buffer)

    const url = `/uploads/logo.${ext}`
    await prisma.config.upsert({
      where:  { key: 'business_logo_url' },
      create: { key: 'business_logo_url', value: url },
      update: { value: url },
    })

    return NextResponse.json({ success: true, url })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Error al guardar el logo' },
      { status: 500 },
    )
  }
}
