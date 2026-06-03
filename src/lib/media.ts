/**
 * src/lib/media.ts — Sistema multimedia unificado
 *
 * uploadMedia(file, type, id?)  → comprime con sharp → guarda en public/uploads/{type}/ → retorna URL pública
 * deleteMedia(url)              → elimina archivo físico + limpia tabla config
 *
 * Tipos aceptados : jpg, png, webp, avif — máx 5 MB
 * Splash           : preserva canal alpha (PNG transparente → webp lossless)
 */

import sharp from 'sharp'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'

// ── Tipos públicos ─────────────────────────────────────────────────────────────
export type MediaType = 'product' | 'logo' | 'hero-slot' | 'splash'

// ── Constantes ─────────────────────────────────────────────────────────────────
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
])
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

// ── uploadMedia ────────────────────────────────────────────────────────────────

/**
 * Procesa y guarda una imagen.
 *
 * @param file  Objeto File proveniente de FormData
 * @param type  Categoría del medio
 * @param id    Requerido para 'product' y 'hero-slot'
 * @returns     URL pública lista para guardar en DB y servir al cliente
 */
export async function uploadMedia(
  file: File,
  type: MediaType,
  id?: string | number,
): Promise<string> {
  // ── Validaciones ─────────────────────────────────────────────────────────────
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error('Formato no permitido. Usa JPG, PNG, WebP o AVIF.')
  }
  if (file.size > MAX_BYTES) {
    throw new Error('El archivo supera el límite de 5 MB.')
  }

  const raw         = Buffer.from(await file.arrayBuffer())
  const ts          = Date.now()
  const uploadsRoot = path.join(process.cwd(), 'public', 'uploads')

  // ── Ruta de destino según tipo ────────────────────────────────────────────────
  let dir: string
  let filename: string
  let urlPublica: string

  switch (type) {
    case 'product':
      if (id === undefined || id === null) throw new Error('id requerido para product')
      dir        = path.join(uploadsRoot, 'products')
      filename   = `${id}.webp`
      urlPublica = `/uploads/products/${filename}`
      break

    case 'logo':
      dir        = uploadsRoot
      filename   = `logo_${ts}.webp`
      urlPublica = `/uploads/${filename}`
      break

    case 'hero-slot':
      if (id === undefined || id === null) throw new Error('id requerido para hero-slot')
      dir        = path.join(uploadsRoot, 'hero')
      filename   = `slot_${id}_${ts}.webp`
      urlPublica = `/uploads/hero/${filename}`
      break

    case 'splash':
      dir        = path.join(uploadsRoot, 'splash')
      filename   = `splash_${ts}.webp`
      urlPublica = `/uploads/splash/${filename}`
      break
  }

  await mkdir(dir, { recursive: true })

  // ── Procesamiento sharp ───────────────────────────────────────────────────────
  let buf: Buffer

  if (type === 'splash') {
    // Detectar canal alpha para preservar transparencia
    buf = await sharp(raw)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ lossless: true, alphaQuality: 100 })
      .toBuffer()

  } else if (type === 'logo') {
    buf = await sharp(raw)
      .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
      .webp({ lossless: true, alphaQuality: 100 })
      .toBuffer()

  } else if (type === 'product') {
    buf = await sharp(raw)
      .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer()

  } else {
    // hero-slot — banner horizontal
    const oversize = raw.byteLength > 1.5 * 1024 * 1024
    buf = await sharp(raw)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: oversize ? 76 : 82 })
      .toBuffer()
  }

  await writeFile(path.join(dir, filename), buf)

  return urlPublica
}

// ── deleteMedia ────────────────────────────────────────────────────────────────

/**
 * Elimina el archivo físico correspondiente a la URL pública
 * y borra cualquier entrada en la tabla config que lo referencie.
 *
 * @param url  URL pública, e.g. /uploads/splash/splash_1234.webp
 */
export async function deleteMedia(url: string): Promise<void> {
  // Convertir URL pública → ruta FS
  const relPath  = url.startsWith('/') ? url.slice(1) : url
  const filePath = path.join(process.cwd(), 'public', relPath)

  try {
    if (existsSync(filePath)) {
      await unlink(filePath)
    }
  } catch { /* no crítico — el archivo puede ya no existir */ }

  // Limpiar entradas de config que apunten a esta URL
  try {
    await prisma.config.deleteMany({ where: { value: url } })
  } catch { /* no crítico */ }
}
