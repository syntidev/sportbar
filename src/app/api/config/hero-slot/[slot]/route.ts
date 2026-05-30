import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import sharp from 'sharp'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const VALID = [1, 2, 3, 4, 5]
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'hero')
const MAX_BYTES  = 1.5 * 1024 * 1024

async function ensureDir() {
  if (!existsSync(UPLOAD_DIR)) await mkdir(UPLOAD_DIR, { recursive: true })
}

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
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ success: false, error: 'Solo imágenes' }, { status: 400 })
    }

    await ensureDir()
    let buf = Buffer.from(await file.arrayBuffer())

    if (buf.byteLength > MAX_BYTES) {
      buf = await sharp(buf)
        .resize({ width: 1440, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer()
    } else {
      // Always convert to webp for consistency
      buf = await sharp(buf).webp({ quality: 88 }).toBuffer()
    }

    const filename = `slot_${slot}.webp`
    await writeFile(path.join(UPLOAD_DIR, filename), buf)

    const key = `hero_slot_${slot}`
    await prisma.config.upsert({
      where:  { key },
      create: { key, value: `/uploads/hero/${filename}` },
      update: { value: `/uploads/hero/${filename}` },
    })

    return NextResponse.json({ success: true, url: `/uploads/hero/${filename}?t=${Date.now()}` })
  } catch (err) {
    console.error('hero-slot upload:', err)
    return NextResponse.json({ success: false, error: 'Error al subir imagen' }, { status: 500 })
  }
}

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
    const filePath = path.join(UPLOAD_DIR, `slot_${slot}.webp`)
    if (existsSync(filePath)) await unlink(filePath)

    await prisma.config.deleteMany({ where: { key: `hero_slot_${slot}` } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('hero-slot delete:', err)
    return NextResponse.json({ success: false, error: 'Error al eliminar slot' }, { status: 500 })
  }
}
