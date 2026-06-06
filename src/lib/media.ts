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
import { randomBytes } from 'crypto'
import path from 'path'
import { prisma } from '@/lib/prisma'

// ── Tipos públicos ─────────────────────────────────────────────────────────────
export type MediaType = 'product' | 'logo' | 'hero-slot' | 'splash'

// ── Constantes ─────────────────────────────────────────────────────────────────
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

/**
 * Hint estándar devuelto por cada endpoint de upload para guiar al usuario.
 * Fuente única — todos los wrappers lo reexportan en su respuesta JSON.
 */
export const UPLOAD_HINT = {
  formats: ['JPG', 'PNG', 'WebP'],
  recommended_size: '800x800px mínimo, fondo transparente para logos',
  max_size_mb: 5,
} as const

/**
 * Error de validación de medios (formato / tamaño).
 * Los wrappers lo mapean a HTTP 400; cualquier otro error → 500.
 */
export class MediaValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MediaValidationError'
  }
}

// ── Generación de nombre único ───────────────────────────────────────────────────
// {tipo}-{timestamp}-{random6}.webp  →  nunca colisiona, nunca sobrescribe por ID
function uniqueName(prefix: string): string {
  const ts   = Date.now()
  const rand = randomBytes(3).toString('hex') // 6 chars hex
  return `${prefix}-${ts}-${rand}.webp`
}

// Mapa tipo → (prefijo de archivo, subcarpeta dentro de public/uploads)
const TARGET: Record<MediaType, { prefix: string; folder: string }> = {
  product:     { prefix: 'product', folder: 'products' },
  logo:        { prefix: 'logo',    folder: 'logos'    },
  'hero-slot': { prefix: 'hero',    folder: 'hero'     },
  splash:      { prefix: 'splash',  folder: 'splash'   },
}

// ── uploadMedia ────────────────────────────────────────────────────────────────

/**
 * Procesa y guarda una imagen.
 *
 * @param file  Objeto File proveniente de FormData
 * @param type  Categoría del medio
 * @param _id   (legacy) ya no se usa para el nombre — el nombre siempre es único
 * @returns     URL pública lista para guardar en DB y servir al cliente
 */
export async function uploadMedia(
  file: File,
  type: MediaType,
  _id?: string | number,
): Promise<string> {
  // ── Validaciones ─────────────────────────────────────────────────────────────
  if (!ALLOWED_MIME.has(file.type)) {
    throw new MediaValidationError('Formato no válido. Usa JPG, PNG o WebP.')
  }
  if (file.size > MAX_BYTES) {
    throw new MediaValidationError('Archivo muy grande. Máximo 5MB.')
  }

  const raw         = Buffer.from(await file.arrayBuffer())
  const uploadsRoot = path.join(process.cwd(), 'public', 'uploads')

  // ── Ruta de destino según tipo — nombre SIEMPRE único, sin colisiones ──────────
  const { prefix, folder } = TARGET[type]
  const dir        = path.join(uploadsRoot, folder)
  const filename   = uniqueName(prefix)
  const urlPublica = `/uploads/${folder}/${filename}`

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
    // hero-slot — banner horizontal · quality 85, sin alfa
    buf = await sharp(raw)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 85 })
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
