// src/app/api/kds/despacho/route.ts
// GET — Órdenes con kitchen_status LISTO listas para despachar.
// KDS Despacho las ve cuando todos los bumps de cocina y bar están completos.

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'
import type { PaymentStatus } from '@/types'

const COOKIE_NAME = 'cafeball_session'

function getSecret(): Uint8Array {
  return new TextEncoder().encode(process.env.JWT_SECRET ?? '')
}

export async function GET(req: NextRequest) {
  // 1. Auth
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) {
    return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
  }

  try {
    await jwtVerify(token, getSecret())
  } catch {
    return NextResponse.json({ success: false, error: 'Sesión inválida' }, { status: 401 })
  }

  // 2. Límite opcional
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10) || 100, 200)

  // 3. Fetch órdenes LISTO
  try {
    const orders = await prisma.order.findMany({
      where: {
        kitchen_status: 'LISTO',
        payment_status: { not: 'CANCELLED' as PaymentStatus },
      },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, category: true } },
          },
          orderBy: { id: 'asc' },
        },
        user: { select: { id: true, code: true, name: true, lastname: true } },
      },
      orderBy: { updated_at: 'asc' }, // más antiguo primero
      take: limit,
    })

    return NextResponse.json({ success: true, orders })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Error al obtener órdenes de despacho' },
      { status: 500 },
    )
  }
}
