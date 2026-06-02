/**
 * Wrapper para product image upload que delega el procesamiento a src/lib/media.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { uploadMedia } from '@/lib/media'
import { prisma } from '@/lib/prisma'

function getSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET ?? '')
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  // ── Auth ──────────────────────────────────────────────────────────────────────
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

  // ── Validación de ID ──────────────────────────────────────────────────────────
  const id = parseInt(params.id, 10)
  if (isNaN(id)) {
    return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 })
  }

  // ── Archivo ───────────────────────────────────────────────────────────────────
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

  // ── Verificar que el producto existe ──────────────────────────────────────────
  const exists = await prisma.product.findUnique({ where: { id }, select: { id: true } })
  if (!exists) {
    return NextResponse.json({ success: false, error: 'Producto no encontrado' }, { status: 404 })
  }

  try {
    // Delegar procesamiento y almacenamiento a media.ts
    // media.ts valida MIME y tamaño, comprime a webp 85 calidad
    const url = await uploadMedia(file, 'product', id)

    // Guardar URL limpia en DB; agregar cache-buster en la respuesta para el browser
    await prisma.product.update({
      where: { id },
      data:  { image_url: url },
    })

    return NextResponse.json({ success: true, image_url: `${url}?v=${Date.now()}` })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al procesar imagen'
    console.error('[product-upload]', err)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
