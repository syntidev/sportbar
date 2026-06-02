import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, unlink, readdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import sharp from 'sharp'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const VALID = [1, 2, 3, 4, 5]
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'hero')

async function ensureDir() {
  if (!existsSync(UPLOAD_DIR)) await mkdir(UPLOAD_DIR, { recursive: true })
}

// Elimina archivos previos del slot (slot_N_*.webp) excepto el nuevo
async function cleanOldFiles(slot: number, keepFilename: string) {
  try {
    const files = await readdir(UPLOAD_DIR)
    const pattern = new RegExp(`^slot_${slot}_\\d+\\.webp$`)
    await Promise.all(
      files
        .filter(f => pattern.test(f) && f !== keepFilename)
        .map(f => unlink(path.join(UPLOAD_DIR, f)).catch(() => {})),
    )
    // Limpiar el nombre legado fijo slot_N.webp si existía
    const legacy = path.join(UPLOAD_DIR, `slot_${slot}.webp`)
    if (existsSync(legacy)) await unlink(legacy).catch(() => {})
  } catch { /* no crítico */ }
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
    let buf: Buffer = Buffer.from(await file.arrayBuffer()) as Buffer

    buf = await sharp(buf)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: buf.byteLength > 1.5 * 1024 * 1024 ? 76 : 82 })
      .toBuffer()

    // Nombre único con timestamp — el browser SIEMPRE ve una URL nueva
    const ts       = Date.now()
    const filename = `slot_${slot}_${ts}.webp`
    await writeFile(path.join(UPLOAD_DIR, filename), buf)

    // Borrar archivos previos de este slot
    await cleanOldFiles(slot, filename)

    const url = `/uploads/hero/${filename}`
    const key = `hero_slot_${slot}`
    await prisma.config.upsert({
      where:  { key },
      create: { key, value: url },
      update: { value: url },
    })

    return NextResponse.json({ success: true, url })
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
    // Borrar todos los archivos de este slot (nombre dinámico)
    try {
      const files = await readdir(UPLOAD_DIR)
      const pattern = new RegExp(`^slot_${slot}(_\\d+)?\\.webp$`)
      await Promise.all(
        files
          .filter(f => pattern.test(f))
          .map(f => unlink(path.join(UPLOAD_DIR, f)).catch(() => {})),
      )
    } catch { /* dir puede no existir */ }

    await prisma.config.deleteMany({ where: { key: `hero_slot_${slot}` } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('hero-slot delete:', err)
    return NextResponse.json({ success: false, error: 'Error al eliminar slot' }, { status: 500 })
  }
}

// PATCH /api/config/hero-slot/[slot] → save only the effect type (hot|cold|none)
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
    console.error('hero-slot patch type:', err)
    return NextResponse.json({ success: false, error: 'Error' }, { status: 500 })
  }
}
