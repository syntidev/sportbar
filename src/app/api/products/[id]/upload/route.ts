import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'

const ALLOWED_TYPES = new Set(['image/webp', 'image/jpeg', 'image/png'])
const MAX_BYTES     = 5 * 1024 * 1024 // 5 MB

function getSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET ?? '')
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const token = req.cookies.get('cafeball_session')?.value
  if (!token) {
    return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
  }

  let actorRole: string
  try {
    const { payload } = await jwtVerify(token, getSecret())
    actorRole = payload['role'] as string
  } catch {
    return NextResponse.json({ success: false, error: 'Sesión inválida' }, { status: 401 })
  }

  if (actorRole !== 'admin') {
    return NextResponse.json({ success: false, error: 'Solo admin puede subir fotos de productos' }, { status: 403 })
  }

  const id = parseInt(params.id, 10)
  if (isNaN(id)) {
    return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 })
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ success: false, error: 'Cuerpo inválido' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ success: false, error: 'No se recibió archivo' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ success: false, error: 'Solo WebP, JPG o PNG' }, { status: 422 })
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ success: false, error: 'Máximo 5 MB por imagen' }, { status: 422 })
  }

  const exists = await prisma.product.findUnique({ where: { id }, select: { id: true } })
  if (!exists) {
    return NextResponse.json({ success: false, error: 'Producto no encontrado' }, { status: 404 })
  }

  try {
    const bytes  = await file.arrayBuffer()
    const raw    = Buffer.from(bytes)

    let outputBuffer: Buffer
    let ext = 'webp'

    try {
      const sharp  = (await import('sharp')).default
      outputBuffer = await sharp(raw).webp({ quality: 85 }).toBuffer()
    } catch {
      // sharp no disponible — conservar formato original
      const mimeExt: Record<string, string> = {
        'image/webp': 'webp',
        'image/jpeg': 'jpg',
        'image/png':  'png',
      }
      ext          = mimeExt[file.type] ?? 'jpg'
      outputBuffer = raw
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products')
    await mkdir(uploadDir, { recursive: true })

    const filename = `${id}.${ext}`
    await writeFile(path.join(uploadDir, filename), outputBuffer)

    // Cache-bust so browser reloads after re-upload
    const imageUrl = `/uploads/products/${filename}?v=${Date.now()}`

    await prisma.product.update({
      where: { id },
      data:  { image_url: `/uploads/products/${filename}` },
    })

    return NextResponse.json({ success: true, image_url: imageUrl })
  } catch (e) {
    console.error('[product-upload]', e)
    return NextResponse.json({ success: false, error: 'Error al procesar imagen' }, { status: 500 })
  }
}
